import { InputPropT } from "../Props/Input"
import { Exception as BaseException } from '@adonisjs/core/build/standalone';
import { DateTime } from 'luxon';
import { Client } from '../../Auth/Client';
import { Status } from '../../Service';
import Log from '../../Log';
import { InputSchema, Model, Schema } from "../Types/Schema";
import { TransitionGuard } from "../Types/Transition";
import Builder from "../Helpers/Builder";
import Validator from "../Helpers/Validator";
import DBException from "../../Exception/DBException";

/**
    [State Machine]
    An abstract state machine.
 */

export abstract class StateMachine< T, S extends Schema > {

    protected validator: Validator<S>
    protected builder: Builder<T, S>

    constructor(
        public $: S
    ) {
        $.States = {
            void: '',
            ...$.States
        }
        this.validator = new Validator(this);
        this.builder = new Builder(this);
    }

    abstract name(format: 'UpperCamel' | 'lower_snake' | 'UPPER_SNAKE'): string

    alias() {
        return this.$.Alias;
    }

    private async guard(
        client: Client,
        guards: TransitionGuard<Model<S>, any>[],
        obj: Model<S>,
        input: any
    ): Promise<boolean> {
        const parent = client.getAction(-2)?.model;
        for (let g in guards) {
            const valid = await guards[g].fn(obj, {input, client, parent, build: this.build.bind(this)});
            if (!valid) throw guards[g].msg(obj, {input, client, parent, build: this.build.bind(this)});
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

    private logDataFromInput(
        input: Record<string,any>,
        schema: InputSchema
    ) {
        if (!input) return;
        const obj = {} as Record<string,any>;
        for (let k in schema) {
            const prop = schema[k] as any as InputPropT;
            if (prop.members) {
                obj[k] = this.logDataFromInput(input[k], prop.members);
            }
            else if (prop.log) obj[k] = input[k];
        }
        return obj;
    }

    protected async runFromModel(
        client: Client, 
        t: keyof S['Transitions'],
        obj: Model<S>,
        input: Record<string,any>
    ): Promise<void> {

        const trans = this.$.Transitions[t as string];
        if (!trans) throw Exception.InvalidTransition(this, t as any);
        
        const from = obj.state;
        const to = trans.to !== '.' ? trans.to : from;
        const old_state = this.$.States[from];
        // const new_state = this.$.States[to];
        
        if (!this.isCurrentState(obj, trans.from as string)) {
            throw Exception.NoTransitionFromCurrentState(this, trans.alias, old_state);
        }

        await this.validator.sanitize(client, t, input);
        await this.validator.validate(client, t, input);

        client.pushAction(this as any, obj, t);

        if (trans.guards) await this.guard(client, trans.guards, obj, input).catch(e => {
            if (e instanceof DBException) throw e;
            throw Exception.TransitionGuardFailed(this, e);
        });       
        
        if (trans.fn) await trans.fn(obj, { input, client, parent: client.getAction(-2)?.model, build: this.build.bind(this) });
        
        obj.state = to as string;
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
            if (e instanceof DBException) throw e;
            throw Exception.SaveFailed(this, e)
        });

        const last = client.getAction(-2);
        const origin = last ? last.machine.name() + '.' + (last.transition as string) : ''
        const log_data = this.logDataFromInput(input, trans.input);
        await Log(this as any, obj.id, client)
            .info(t as string, origin, `${trans.alias} ${this.alias()} id:${obj.id}`, log_data || {});

        if (trans.after) {
            await trans.after(obj, { input, client, parent: client.getAction(-2)?.model, build: this.build.bind(this) })
            await this.save(client, obj, t === 'create').catch(e => {
                if (e instanceof DBException) throw e;
                throw Exception.SaveFailed(this, e)
            });
        }

        const is_secondary_loop = trans.to === '.' && client.stackLength() > 1;
        if (this.$.Hooks && !is_secondary_loop) {
            for (let h in this.$.Hooks) {
                const hook = this.$.Hooks[h];
                if ((hook.state === from && hook.on === 'exit') ||
                    (hook.state === to   && hook.on === 'enter'))
                    await hook.fn(obj,{
                        client,
                        input,
                        run: async (t, input) => {
                            return this.runFromModel(client, t as any, obj, input);
                        }
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

    /* Build */

    protected async build(client: Client, obj: Model<S>): Promise<T> {
        return this.builder.build(client, obj);
    }

    protected async buildAll(client: Client, objs: Model<S>[]): Promise<T[]> {
        const entities = [];
        for (let o in objs) {
            const obj = objs[o];
            const entity = await this.build(client, obj);
            entities.push(entity);
        }
        return entities;
    }

}

export class Exception extends BaseException {

    constructor(machine: StateMachine<any, any>, message: string, status: Status) {
        super(message, status, 'E_'+machine.name('UPPER_SNAKE'))
    }

    static Rule(machine: StateMachine<any, any>, msg: string) {
        return new this(machine, msg, Status.BADREQUEST);
    }

    static InvalidTransition(machine: StateMachine<any, any>, transition: string) {
        return new this(machine, `Transição inválida: ${transition}`, Status.BADREQUEST);
    }

    static NoTransitionFromCurrentState(machine: StateMachine<any, any>, event: string, state: string) {
        return new this(machine, `Não é possível ${event} um(a) ${machine.alias()} ${state}`, Status.BADREQUEST);
    }

    static TransitionGuardFailed(machine: StateMachine<any, any>, msg: string) {
        return new this(machine, msg, Status.BADREQUEST);
    }

    static TransitionFailed(machine: StateMachine<any, any>, trans: string, e: Error) {
        return new this(machine, `[${trans}|after] ${e.message}`, Status.BADREQUEST);
    }

    static SaveFailed(machine: StateMachine<any, any>, e: Error) {
        return new this(machine, `[save] ${e.message}`, Status.BADREQUEST);
    }

}