import { validator, schema, TypedSchema, ParsedTypedSchema } from '@ioc:Adonis/Core/Validator'
import { InputProp, InputPropType, InputSchema, inputSchemaToValidator } from "./Input"
import { Exception as BaseException } from '@adonisjs/core/build/standalone';
import { DateTime } from 'luxon';
import { Resource, Schema } from ".";
import { isEmpty } from './Util/Validator';
import { Client } from './Util/Auth';

/* Callbacks */

export type StateCallback<Model, Output> = (obj: Model, client: Client) => Promise<Output>
export type TransitionCallback<Model, Input, Output> = (obj: Model, input: { [k in keyof Input]: InputPropType<Input[k]> }, client: Client, from: string) => Promise<Output>

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
        console.log('validate', t, this.$.Model.table);
        if (input.__validated__) return;
        console.log('do validate', t, this.$.Model.table);
        await this.validateFields(t, input);
        await this.validateRules(this.$.Transitions[t as any].input, input, 'runtime');
        await this.validateRules(this.$.Transitions[t as any].input, input, 'database');
        this.assignDefaults(this.$.Transitions[t as any].input, input);
        this.flagValidated(this.$.Transitions[t as any].input, input);
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
        scope: 'runtime' | 'database' | 'service',
        resource?: Resource<any,any>
    ): Promise<void> {
        for (let key in schema) {
            const prop = schema[key] as any as InputProp<any>;
            if (isEmpty(input[key])) continue;
            for (let r in prop.rules) {
                const rule = prop.rules[r];
                if (rule.scope !== scope) continue;
                const model = resource ? resource.$.Model : this.$.Model;
                const ok = await rule.fn(model, input[key]);
                if (!ok) throw Exception.Rule(rule.msg(prop.alias));
            }
            if (prop.members)
                await this.validateRules(prop.members, input[key], scope, prop.child);
        }     
    }

    private assignDefaults(
        schema: InputSchema,
        input: Record<string,any>
    ): void {
        Object.keys(schema).map(key => {
            const prop = schema[key] as any as InputProp<any>;
            if (isEmpty(input[key]) && !isEmpty(prop.default))
                input[key] = prop.default;
            if (prop.members)
                this.assignDefaults(prop.members, input[key] || {});
        })        
    }

    private flagValidated(
        schema: InputSchema,
        input: Record<string,any>
    ): void {
        input.__validated__ = true;
        Object.keys(schema).map(key => {
            const prop = schema[key] as any as InputProp<any>;
            if (prop.type === 'child' && input[key])
                this.flagValidated(prop.members || {}, input[key]);
        })
    }

    /* State Machine */

    private async guard(
        client: Client,
        guards: TransitionCallback<Model<S>, any, boolean>[],
        obj: Model<S>,
        input: any,
        from: string
    ): Promise<boolean> {
        for (let g in guards) {
            let valid = await guards[g](obj, input, client, from);
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
        client: Client, 
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

        if (trans.guards) await this.guard(client, trans.guards, obj, input, obj.state).catch(e => {
            throw Exception.TransitionGuardFailed(e);
        });       
        
        if (old_state.before_exit) await old_state.before_exit(obj, client);
        if (trans.fn) await trans.fn(obj, input, client, from);
        if (new_state.before_enter) await new_state.before_enter(obj, client);
        
        obj.state = to;
        if (t === 'create') {
            obj.created_at = DateTime.now();
            obj.created_by = client.user.id;
        }
        await this.save(client, obj);

        if (old_state.after_exit) await old_state.after_exit(obj, client);
        if (new_state.after_enter) await new_state.after_enter(obj, client);

    }

    private async save(
        client: Client,
        obj: Model<S>
    ) {
        obj.updated_at = DateTime.now();
        obj.updated_by = client.user.id;
        if (obj.state === 'deleted') {
            obj.deleted_at = DateTime.now();
            obj.deleted_by = client.user.id;
        }
        obj.useTransaction(client.trx);
        await obj.save().catch(e => {
            throw Exception.SaveFailed(e)
        })
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

}