import { validator, schema, TypedSchema, ParsedTypedSchema } from '@ioc:Adonis/Core/Validator'
import { InputProp, InputPropBuilder } from "./Input"
import { Exception as BaseException } from '@adonisjs/core/build/standalone';
import { DateTime } from 'luxon';
import { InputPropType, Model } from ".";
import { isEmpty } from '../Validator/ResourceSchemaValidator';
import { Client } from '../Auth/Client';
import { InputSchema, Schema, TransitionSchema } from './Schema';
import ResourceMachine from './ResourceMachine';
import { InputValidator } from '../Validator/InputValidator';
import { Status } from '../Service';
import Log from '../Log';

/* 
    [Resource State]
    A state which can be assumed by a resource.
 */

export type State = string

/**
    [Resource Transition]
    Defines a transition as a link between states.
 */

export interface Transition<
    Model,
    From,
    To,
    Input
> {
    alias: string
    from: From | From[] 
    to: To
    input: Input
    guards?: TransitionCallback<Model,Input,boolean>[]
    fn?: TransitionCallback<Model,Input,void>
    after?: TransitionCallback<Model,Input,void>
}

export function Transition<
    Model,
    From,
    To,
    Input extends InputSchema
>(
    transition: Transition<Model,From,To,Input>
) {
    return transition;
}

export type TransitionInput<
    E extends Transition<any,any,any,any>
> = {
    [k in keyof E['input']]: InputPropType<E['input'][k]>
}

/**
    [Resource Hook]
    Defines a hook to be run when entering/exiting an state.
 */
export interface Hook<
    Model,
    States,
    Transitions extends TransitionSchema<Model,States>
> {
    on: 'enter' | 'exit'
    state: keyof States
    fn: HookCallback<Model,Transitions,void>
}

/**
    [Resource Method]
    A method which runs a transition.
 */

export type Method<
    T extends Transition<any,any,any,any>
> = (
    client: Client,
    input: TransitionInput<T>
) => Promise<void>

/**
    [Resource Methods]
    A record of all method which aren't 'create'.
 */

export type Methods<
    Transitions extends TransitionSchema<any,any>
> = {
    [x in keyof Omit<Transitions,'create'>] : Method<Transitions[x]>
}

/**
    [Resource Hook Callback]
    A callback run by a hook.
 */

export type HookCallback<
    Model,
    Transitions extends TransitionSchema<Model, any>,
    Output
> = (
    obj: Model,
    client: Client,
    run: <K extends keyof Transitions>(transition: K, input: TransitionInput<Transitions[K]>) => Promise<void>
) =>
    Promise<Output>

/**
    [Input Links]
    Used to read inputs linked to other resources
 */


type LinkInputProps<T> = {
    [K in keyof T]: T[K] extends InputPropBuilder<any, infer Y> ? (Y extends never ? never : K ) : never
}[keyof T]

type LinkInputPropType<T> = 
    T extends InputPropBuilder<any, infer Y> ? Y : never

type LinkName<S extends string> = S extends `${infer Head}_id` ? `$${Head}` : (
    S extends `${infer Head}y_ids` ? `$${Head}ies` : (
        S extends `${infer Head}_ids` ? `$${Head}s` : S
    )
);

/**
    [Resource Transition Callback]
    A callback run by a transition.
 */

export type TransitionCallback<
    Model,
    Input,
    Output
> = (
    obj: Model,
    input: {
        [k in keyof Input]: InputPropType<Input[k]>
    } & {
        [k in LinkInputProps<Input> as LinkName<string & k>]: LinkInputPropType<Input[k]>
    },
    client: Client,
    from: string
) =>
    Promise<Output>

/**
    [State Machine]
    An abstract state machine.
 */

export abstract class StateMachine< S extends Schema > {

    private validator: Record<string, ParsedTypedSchema<TypedSchema>> = {}

    constructor(
        public $: S
    ) {
        $.States = {
            void: '',
            ...$.States
        }
        Object.keys($.Transitions).forEach(t => {
            let event = $.Transitions[t];
            this.validator[t] = schema.create(InputValidator.fromSchema(event.input));
        })
    }

    abstract name(snake_case?: boolean): string

    alias() {
        return this.$.Alias;
    }
    
    /* 
        Input Sanitization
        - Remove internal use '__keys__' 
        - Remove protected/private props according to scope
    */

    private async sanitize(
        client: Client,
        t: keyof S['Transitions'],
        input: Record<string,any>
    ): Promise<void> {

        let scope = 'public';
        if (client.stackLength() > 0) {
            const last_action = client.getAction(-1);
            if (this === last_action.resource) scope = 'private';
            else scope = 'protected';
        }

        if (scope === 'public')
            this.filterInternalKeys(input);
        if (scope !== 'private')
            this.filterInputScope(scope as any, this.$.Transitions[t as any].input, input);
        
        input.__scope__ = scope;
    }

    private filterInternalKeys(
        input: Record<string,any>
    ): void {
        Object.keys(input).map(key => {
            const prop = input[key];
            if (Array.isArray(prop))
                return prop.forEach((i:any) => this.filterInternalKeys(i));
            if (typeof prop === 'object')
                return this.filterInternalKeys(prop);
            if (key.startsWith('__') && key.endsWith('__'))
                delete input[key];
        })
    }

    private filterInputScope(
        scope: 'public'|'protected',
        schema: InputSchema,
        input: Record<string,any>
    ): void {
        Object.keys(schema).map(key => {
            const prop = schema[key] as any as InputProp<any>;
            if (prop.scope === 'public' ||
               (prop.scope === 'protected' && scope !== 'public')) {
                if (prop.members && (key in input))
                    this.filterInputScope(scope, prop.members, input[key]);
                return;
            }
            if (Array.isArray(input)) input.forEach((i:any) => delete i[key]);
            else delete input[key];
        })
    }

    /* 
        Input Validation
        - Validate presence and type of props
        - Validate runtime/database/service rules
        - Assign default values
    */

    private async validate(
        client: Client,
        t: keyof S['Transitions'],
        input: Record<string,any>
    ): Promise<void> {
        const schema = this.$.Transitions[t as any].input;
        await this.validateFields(t, input);
        await this.validateRules(client, schema, input, 'runtime');
        this.assignDefaults(schema, input);
        await this.validateRules(client, schema, input, 'database');
        await this.validateRules(client, schema, input, 'service');
        this.flagValidated(schema, input);
    }

    private async validateFields(
        t: keyof S['Transitions'],
        input: Record<string,any>
    ): Promise<void> {
        if (input.__validated__ && input.__scope__ == 'public') return;
        const schema = this.validator[t as string];
        await validator.validate({ schema, data: input });
    }

    private async validateRules(
        client: Client,
        schema: InputSchema,
        input: Record<string,any>,
        scope: 'runtime' | 'database' | 'service',
        resource?: ResourceMachine<any,any>
    ): Promise<void> {
        for (let key in schema) {
            const prop = schema[key] as any as InputProp<any>;
            if (isEmpty(input[key]) && prop.type !== 'id') continue;
            
            if (input.__validated__ && prop.scope === 'public') {
                if (prop.members)
                    await this.validateRules(client, prop.members, input[key], scope, prop.child);    
                continue;
            }

            const data = Array.isArray(input) ? input : [input];
            for (let d in data) {
                const obj = data[d];
                for (let r in prop.rules) {
                    const rule = prop.rules[r];
                    if (rule.scope !== scope) continue;
                    const machine = resource ? resource : this;
                    const ok = await rule.fn(obj, key, machine, prop, client);
                    if (!ok) throw Exception.Rule(rule.msg(prop.alias));
                }
            }
            if (prop.members)
                await this.validateRules(client, prop.members, input[key], scope, prop.child);
        }     
    }

    private assignDefaults(
        schema: InputSchema,
        input: Record<string,any>
    ): void {
        Object.keys(schema).map(key => {
            const prop = schema[key] as any as InputProp<any>;
            
            if (input.__validated__ && prop.scope === 'public') {
                if (prop.members)
                    this.assignDefaults(prop.members, input[key] || {});
                return;
            }

            if (isEmpty(input[key]) && prop.default_value !== undefined)
                input[key] = prop.default_value;
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
            if (input[key]) {
                if (prop.type === 'child') {
                    if (!prop.list)
                        this.flagValidated(prop.members || {}, input[key]);
                    else
                        input[key].forEach((i: any) => this.flagValidated(prop.members || {}, i))
                }
            }
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
        let valid = true;
        for (let g in guards) {
            valid = await guards[g](obj, input, client, from);
            if (!valid) break;
        }
        if (!valid) throw '<guard message goes here>'
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

    protected async runFromModel(
        client: Client, 
        t: keyof S['Transitions'],
        obj: Model<S>,
        input: Record<string,any>
    ): Promise<void> {

        const trans = this.$.Transitions[t as string];
        if (!trans) throw Exception.InvalidTransition(t as any);
        
        const from = obj.state;
        const to = trans.to;
        const old_state = this.$.States[from];
        // const new_state = this.$.States[to];
        
        if (!this.isCurrentState(obj, trans.from)) {
            throw Exception.NoTransitionFromCurrentState(trans.alias, old_state);
        }

        await this.sanitize(client, t, input);
        await this.validate(client, t, input);

        client.pushAction(this as any, t);

        if (trans.guards) await this.guard(client, trans.guards, obj, input, obj.state).catch(e => {
            throw Exception.TransitionGuardFailed(e);
        });       
        
        if (trans.fn) await trans.fn(obj, input, client, from);
        
        obj.state = to;
        if (t === 'create') {
            obj.created_at = DateTime.now();
            obj.created_by = client.user.id;
        }
        obj.updated_at = DateTime.now();
        obj.updated_by = client.user.id;
        if (obj.state === 'deleted') {
            obj.deleted_at = DateTime.now();
            obj.deleted_by = client.user.id;
        }
        await this.save(client, obj, t === 'create').catch(e => {
            throw Exception.SaveFailed(e)
        });

        const last = client.getAction(-2);
        const origin = last ? last.resource.name() + '.' + (last.transition as string) : ''
        await Log(this as any, obj.id, client)
            .info(t as string, origin, `${trans.alias} ${this.alias()} id:${obj.id}`, input);

        if (trans.after) await trans.after(obj, input, client, from)

        if (this.$.Hooks) {
            for (let h in this.$.Hooks) {
                const hook = this.$.Hooks[h];
                if ((hook.state === from && hook.on === 'exit') ||
                    (hook.state === to   && hook.on === 'enter'))
                    await hook.fn(obj, client, async (t, input) => {
                        return this.runFromModel(client, t as any, obj, input);
                    });
            }
        }

        client.popAction();
    }

    protected abstract save(
        client: Client,
        obj: Model<S>,
        create: boolean
    ): Promise<void>

}

class Exception extends BaseException {

    static code = 'E_STATE_MACHINE'

    static Rule(msg: string) {
        return new this(msg, 402, this.code);
    }

    static InvalidTransition(transition: string) {
        return new this(`Transição inválida: ${transition}`, Status.INTERNAL_SERVER, this.code);
    }

    static NoTransitionFromCurrentState(event: string, state: string) {
        return new this(`Não é possível ${event} a partir do estado ${state}`, Status.BADREQUEST, this.code);
    }

    static TransitionGuardFailed(e: Error) {
        return new this(`[transition|guard] ${e.message}`, Status.BADREQUEST, this.code);
    }

    static TransitionFailed(e: Error) {
        return new this(`[transition|after] ${e.message}`, Status.BADREQUEST, this.code);
    }

    static SaveFailed(e: Error) {
        return new this(`[save] ${e.message}`, Status.BADREQUEST, this.code);
    }

}