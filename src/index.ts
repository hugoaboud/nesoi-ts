import BaseModel from "./Model"
import { OutputSchema, PropSchema, PropType } from "./Output"
import { TransitionSchema, TransitionInput, StateSchema, Transition as $Transition, StateMachine } from "./StateMachine"
import { Prop as $Prop } from './Output';
import { InputProp as $InputProp } from './Input';
import { GraphLink as $GraphLink, GraphLinkSchema } from './Graph';
import { Exception as BaseException } from '@adonisjs/core/build/standalone';
import { DateTime } from 'luxon'
import { Client } from "./Util/Auth";
import { ResourceSchemaValidator } from "./Util/Validator";
import { CamelToSnakeCase } from "./Util/String";

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
        // created_by: number
        // updated_by: number
        created_at: DateTime
        updated_at: DateTime
    } & 
    { [k in keyof S['Output']]: PropType<S['Output'][k]> } & 
    Omit<{ [k in keyof S['Transitions']]: (input: TransitionInput<S['Transitions'][k]>) => string }, 'create'>

/**
    [Resource Prop]
    Property of a resource entity.
*/

export const Prop = $Prop

/**
    [Resource GraphLink]
    
*/

export const GraphLink = $GraphLink

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
            // created_by: Prop<any>()('created_by').int,
            // updated_by: Prop<any>()('updated_by').int,
            created_at: Prop<any>()('created_at').string,
            updated_at: Prop<any>()('updated_at').string
        };
    }

    name(snake_case = false): string {
        const name = this.$.Model.name.replace('Model','');
        if (!snake_case) return name;
        return CamelToSnakeCase(name);
    }

    /* CRUD */

    async create(
        client: Client,
        input: Input<S,'create'>,
        extra?: Record<string,any>
    ): Promise<T> {
        const obj = new this.$.Model() as Model<S>;
        obj.state = 'void';
        if (extra) Object.assign(input, extra);
        await this.run(client, 'create', obj, input);
        return this.build(client, obj);
    }

    async createMany(
        client: Client,
        inputs: Input<S,'create'>[],
        extra?: (input: Input<S,'create'>) => Record<string,any>
    ): Promise<T[]> {
        const objs = [] as T[];
        for (let i in inputs) {
            const input = inputs[i];
            if (extra) Object.assign(input, extra(input));
            const obj = await this.create(client, input);
            objs.push(obj);
        }
        return objs;
    }

    async readAll(client: Client): Promise<T[]> {
        const objs = await this.readAllFromModel(client, this.$.Model);
        return this.buildAll(client, objs);
    }

    async readOne(client: Client, id: number): Promise<T> {
        const obj = await this.readOneFromModel(client, this.$.Model, id);
        if (!obj) throw Exception.NotFound(id);
        return this.build(client, obj);
    }

    async readOneGroup(client: Client, key: keyof Model<S>, id: number): Promise<T[]> {
        const objs = await this.readOneGroupFromModel(client, this.$.Model, key as string, id);
        return this.buildAll(client, objs);
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
            else if (prop instanceof GraphLinkSchema) {
                if (prop.many)
                    entity[key] = await this.buildLinkMany(client, obj, prop);
                else
                    entity[key] = await this.buildLinkSingle(client, obj, prop);
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

    private async buildLinkSingle<R extends Resource<any,S>>(
        client: Client,
        obj: Model<S>,
        link: GraphLinkSchema<R>
    ) {
        const fkey = link.resource.name(true) + '_id';
        return link.resource.readOne(client, (obj as any)[fkey]);
    }

    private async buildLinkMany<R extends Resource<any,S>>(
        client: Client,
        obj: Model<S>,
        link: GraphLinkSchema<R>
    ) {
        const fkey = this.name(true) + '_id';
        return link.resource.readOneGroup(client, fkey as any, obj.id);
    }

    /* DB */

    private async readOneFromModel(
        client: Client,
        model: typeof BaseModel,
        id: number
    ) {
        let query = model.query();
        if (client.trx) query = query.useTransaction(client.trx);
        return query.where('id', id).first() as Model<S> | null;
    }

    private async readAllFromModel(
        client: Client,
        model: typeof BaseModel
    ) {
        let query = model.query();
        if (client.trx) query = query.useTransaction(client.trx);
        return await query as Model<S>[];
    }

    private async readOneGroupFromModel(
        client: Client,
        model: typeof BaseModel,
        key: string,
        id: number
    ) {
        let query = model.query();
        if (client.trx) query = query.useTransaction(client.trx);
        return await query.where(key, id) as Model<S>[];
    }

}

class Exception extends BaseException {

    static code = 'E_RESOURCE'

    static NotFound(id: number) {
        return new this(`Não encontrado: ${id}`, 402, this.code);
    }

}