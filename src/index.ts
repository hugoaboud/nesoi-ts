import BaseModel from "./Model"
import { OutputSchema, PropSchema, PropType } from "./Output"
import { TransitionSchema, TransitionInput, StateSchema, Transition as $Transition, StateMachine } from "./StateMachine"
import { Prop as $Prop } from './Output';
import { InputProp as $InputProp } from './Input';
import { Exception as BaseException } from '@adonisjs/core/build/standalone';
import { DateTime } from 'luxon'
import { Client } from "./Util/Auth";
import { ResourceSchemaValidator } from "./Util/Validator";

/**
    [Resource Schema]
    Schema which defines the resource behaviour.
*/

export function Schema<
    T extends typeof BaseModel,
    Model extends InstanceType<T>,
    Output extends OutputSchema<Model>,
    States extends StateSchema<Model>,
    Transitions extends TransitionSchema<Model,States>
>(schema: {
    Model: T
    Output: Output
    States: States
    Transitions: Transitions
}) {
    return schema;
}
export type Schema = {
    Model: typeof BaseModel
    Output: OutputSchema<any>
    States: StateSchema<any>
    Transitions: Record<string, $Transition<any,any,any,any>>
}

/**
    [Resource Type]
    Merges the given type properties with transition methods.
*/

export type Type<S extends Schema> = 
    { 
        id: number
        created_by: number
        updated_by: number
        deleted_by?: number
        created_at: DateTime
        updated_at: DateTime
        deleted_at?: DateTime
    } & 
    { [k in keyof S['Output']]: PropType<S['Output'][k]> } & 
    Omit<{ [k in keyof S['Transitions']]: (input: TransitionInput<S['Transitions'][k]>) => string }, 'create'>

/**
    [Resource Prop]
    Property of a resource entity.
*/

export const Prop = $Prop

/**
    [Resource InputProp]
    Input validator property.
*/

export const InputProp = $InputProp

/**
    [Resource InputProp]
    Input validator property.
*/

export const Transition = $Transition

/**
    [Resource]
    A custom State Machine for handling data in a database.
*/

export type Input<S extends Schema,T extends keyof S['Transitions']> = TransitionInput<S['Transitions'][T]>
type Model<S extends Schema> = InstanceType<S['Model']>

export class Resource< T, S extends Schema > extends StateMachine<S>{

    constructor($: S) {
        super($);
        ResourceSchemaValidator.validate($);
        this.$.Output = {
            id: Prop<any>()('id').int,
            ...this.$.Output,
            created_by: Prop<any>()('created_by').int,
            updated_by: Prop<any>()('updated_by').int,
            deleted_by: Prop<any>()('deleted_by').int,
            created_at: Prop<any>()('created_at').string,
            updated_at: Prop<any>()('updated_at').string,
            deleted_at: Prop<any>()('deleted_at').string
        };
    }

    /* CRUD */

    async create(client: Client, input: Input<S,'create'>): Promise<T> {
        const obj = new this.$.Model() as Model<S>;
        obj.state = 'void';
        await this.run(client, 'create', obj, input);
        await obj.refresh();
        return this.build(client, obj);
    }

    async readAll(client: Client): Promise<T[]> {
        let query = this.$.Model.query();
        if (client.trx) query = query.useTransaction(client.trx);
        const objs = await query as Model<S>[];
        return this.buildAll(client, objs);
    }

    async readOne(client: Client, id: number): Promise<T> {
        let query = this.$.Model.query();
        if (client.trx) query = query.useTransaction(client.trx);
        const obj = await query.where('id', id).first() as Model<S>;
        if (!obj) throw Exception.NotFound(id);
        return this.build(client, obj);
    }

    private async build(
        client: Client,
        obj: Model<S>,
        schema: S['Output']|undefined = undefined,
        entity: Record<string, any> = {}
    ): Promise<T> {
        if (!schema) schema = this.$.Output;

        for (let key in schema) {
            const prop = schema![key];
            if (prop instanceof PropSchema) {
                if (prop.source != 'model') continue;
                if (prop.async)
                    entity[key] = await prop.fn(obj, client);
                else
                    entity[key] = prop.fn(obj, client);
                continue;
            }
            entity[key] = {};
            await this.build(client, obj, schema[key] as any, entity[key]);
        }

        return entity as any;
    }
    
    private async buildAll(client: Client, objs: Model<S>[]): Promise<T[]> {
        return Promise.all(objs.map(
            async obj => this.build(client, obj)
        ));
    }

}

class Exception extends BaseException {

    static code = 'E_RESOURCE'

    static NotFound(id: number) {
        return new this(`Não encontrado: ${id}`, 402, this.code);
    }

}