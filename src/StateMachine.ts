import { validator, schema, TypedSchema, ParsedTypedSchema } from '@ioc:Adonis/Core/Validator'
import { InputProp, InputPropType, InputSchema, inputSchemaToValidator } from "./Input"
import { Exception as BaseException } from '@adonisjs/core/build/standalone';
import { DateTime } from 'luxon';
import { Schema } from ".";
import { isEmpty } from './Util/Validator';

/* Callbacks */

export type StateCallback<Model, Output> = (obj: Model) => Promise<Output>
export type TransitionCallback<Model, Input, Output> = (obj: Model, input: { [k in keyof Input]: InputPropType<Input[k]> }, from: string) => Promise<Output>

/* State */

export interface State<Model> {
    alias: string
    
    before_exit?: StateCallback<Model,void>
    before_enter?: StateCallback<Model,void>
    after_exit?: StateCallback<Model,void>
    after_enter?: StateCallback<Model,void>
}

export type StateSchema<Model> = {
    created: State<Model>
} & Record<string, State<Model>>

/* Transition */

export interface Transition<Model, From, To, Input> {
    alias: string
    from: From | From[] 
    to: To
    input: Input
    guards?: TransitionCallback<Model,Input,boolean>[]
    fn?: TransitionCallback<Model,Input,void>
}
export function Transition<Model, From, To, Input extends InputSchema>(transition: Transition<Model, From, To, Input>) { return transition; }

export type TransitionSchema<Model,States> = {
    create: Transition<Model,'void','created',any>
} & Record<string, Transition<Model,keyof States|'void'|'*',keyof States,any>>

export type TransitionInput<E extends Transition<any,any,any,any>> = { [k in keyof E['input']]: InputPropType<E['input'][k]> }

/* State Machine */

type Model<S extends Schema> = InstanceType<S['Model']>

export class StateMachine< S extends Schema > {

    private validator: Record<string, ParsedTypedSchema<TypedSchema>> = {}

    constructor(
        public $: S
    ) {
        $.States = {
            void:     { alias: '' },
            ...$.States
        }
        Object.keys($.Transitions).forEach(t => {
            let event = $.Transitions[t];
            this.validator[t] = schema.create(inputSchemaToValidator(event.input));
        })
    }

    /* Input Validation / Sanitization */

    private async validate(
        t: keyof S['Transitions'],
        input: Record<string,any>
    ): Promise<void> {
        await this.validateFields(t, input);
        await this.validateRules(this.$.Transitions[t as any].input, input, 'runtime');
        await this.validateRules(this.$.Transitions[t as any].input, input, 'database');
        this.assignDefaults(this.$.Transitions[t as any].input, input);
    }

    private async validateFields(
        t: keyof S['Transitions'],
        input: Record<string,any>
    ): Promise<void> {
        const schema = this.validator[t as string];
        await validator.validate({ schema, data: input });
    }

    private async validateRules(
        schema: InputSchema,
        input: Record<string,any>,
        scope: 'runtime' | 'database' | 'service'
    ): Promise<void> {
        for (let key in schema) {
            const prop = schema[key] as any as InputProp<any>;
            if (isEmpty(input[key])) continue;
            if (prop.type === 'object') {
                await this.validateRules(prop.members!, input[key], scope);
                continue;
            }
            if (!prop.rules.length) continue;
            for (let r in prop.rules) {
                const rule = prop.rules[r];
                if (rule.scope !== scope) continue;
                const ok = await rule.fn(this.$.Model, input[key]);
                if (!ok) throw Exception.Rule(rule.msg(prop.alias));
            }
        }     
    }

    private assignDefaults(
        schema: InputSchema,
        input: Record<string,any>
    ): void {
        Object.keys(schema).map(key => {
            const prop = schema[key] as any as InputProp<any>;
            if (prop.required === true) return;
            if (!isEmpty(input[key])) return;
            if (isEmpty(prop.default)) {
                if (prop.type === 'object')
                    this.assignDefaults(input[key] || {}, prop.members!);
                return;    
            };
            input[key] = prop.default;
        })        
    }

    /* State Machine */

    private async guard(
        guards: TransitionCallback<Model<S>, any, boolean>[],
        obj: Model<S>,
        input: any,
        from: string
    ): Promise<boolean> {
        for (let g in guards) {
            let valid = await guards[g](obj, input, from);
            if (!valid) return false;
        }
        return true;
    }

    private isCurrentState(
        obj: Model<S>,
        state: string | string[]
    ): boolean {
        if (state === '*') return true;
        if (Array.isArray(state)) {
            if (state.includes(obj.state)) return true;
        }
        if (obj.state === state) return true;
        return false;
    }

    protected async run(
        t: keyof S['Transitions'],
        obj: Model<S>,
        input: Record<string,any>
    ): Promise<void> {

        const trans = this.$.Transitions[t as string];
        
        const from = obj.state;
        const to = trans.to;
        const old_state = this.$.States[from];
        const new_state = this.$.States[to];
        
        if (!this.isCurrentState(obj, trans.from)) {
            throw Exception.NoTransitionFromCurrentState(trans.alias, old_state.alias);
        }
        
        await this.validate(t, input);

        if (trans.guards) await this.guard(trans.guards, obj, input, obj.state).catch(e => {
            throw Exception.TransitionGuardFailed(e);
        });       
        
        if (old_state.before_exit) await old_state.before_exit(obj).catch(e => {
            throw Exception.StateBeforeExitFailed(e);
        });

        if (trans.fn) await trans.fn(obj, input, from).catch(e => {
            throw Exception.TransitionFailed(e);
        });

        if (new_state.before_enter) await new_state.before_enter(obj).catch(e => {
            throw Exception.StateBeforeEnterFailed(e);
        });

        if (obj.state === 'void') {
            obj.created_at = DateTime.now();
            obj.created_by = 0;
        }
        obj.state = to;
        obj.updated_at = DateTime.now();
        obj.updated_by = 0;
        if (obj.state === 'deleted') {
            obj.deleted_at = DateTime.now();
            obj.deleted_by = 0;
        }
        await obj.save().catch(e => {
            throw Exception.SaveFailed(e)
        })

        if (old_state.after_exit) await old_state.after_exit(obj).catch(e => {
            throw Exception.StateAfterExitFailed(e);
        });
        
        if (new_state.after_enter) await new_state.after_enter(obj).catch(e => {
            throw Exception.StateAfterEnterFailed(e);
        });

    }

}

class Exception extends BaseException {

    static code = 'E_STATE_MACHINE'

    static Rule(msg: string) {
        return new this(msg, 402, this.code);
    }

    static NoTransitionFromCurrentState(event: string, state: string) {
        return new this(`Não é possível ${event} a partir do estado ${state}`, 402, this.code);
    }

    static TransitionGuardFailed(e: Error) {
        return new this(`[transition|guard] ${e.message}`, 402, this.code);
    }

    static TransitionFailed(e: Error) {
        return new this(`[transition|after] ${e.message}`, 402, this.code);
    }

    static SaveFailed(e: Error) {
        return new this(`[save] ${e.message}`, 402, this.code);
    }

    static StateBeforeExitFailed(e: Error) {
        return new this(`[state|before_exit] ${e.message}`, 402, this.code);
    }

    static StateBeforeEnterFailed(e: Error) {
        return new this(`[state|before_enter] ${e.message}`, 402, this.code);
    }

    static StateAfterExitFailed(e: Error) {
        return new this(`[state|after_exit] ${e.message}`, 402, this.code);
    }

    static StateAfterEnterFailed(e: Error) {
        return new this(`[state|after_enter] ${e.message}`, 402, this.code);
    }

}