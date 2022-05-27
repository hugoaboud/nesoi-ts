import { Exception as BaseException } from '@adonisjs/core/build/standalone';
import { Model } from ".";
import { Status } from '../Service';
import { Client } from "../Auth/Client";
import { CamelToSnakeCase } from "../Util/String";
import { ResourceSchemaValidator } from "../Validator/ResourceSchemaValidator";
import { GraphLink } from "./Graph";
import { Input } from "./Input";
import BaseModel from "./Model";
import { Prop, $ as $Prop } from "./Output";
import { Schema } from "./Schema";
import { StateMachine } from './StateMachine';
import { QueryBuilder } from './Helpers/Query';

/**
    [ Resource Machine ]
    A custom State Machine for handling data in a database.
*/

export default class ResourceMachine< T, S extends Schema > extends StateMachine<S>{

    constructor($: S) {
        super($);
        ResourceSchemaValidator.validate(this, $);
        if (($ as any).Service) return;
        this.$.Output = {
            id: $Prop<any>()('id').int,
            ...this.$.Output,
            created_at: $Prop<any>()('created_at').string,
            updated_at: $Prop<any>()('updated_at').string
        };
    }

    name(snake_case = false): string {
        const name = this.$.Model.name.replace('Model','');
        if (!snake_case) return name;
        return CamelToSnakeCase(name);
    }

    /* Read */

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

    /* Query */

    query(client: Client): QueryBuilder {
        return new QueryBuilder(client, this);
    }

    protected async runQuery(client: Client, query: QueryBuilder): Promise<T[]> {
        return [];
    }

    /* Create */

    async create(
        client: Client,
        input: Input<S,'create'>,
        extra?: Record<string,any>
    ): Promise<T> {
        const obj = new this.$.Model() as Model<S>;
        obj.state = 'void';
        if (extra) Object.assign(input, extra);
        await this.runFromModel(client, 'create', obj, input);
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

    /**
        Run a transition for a resource, by id
     */

    async run<
        K extends keyof Omit<S['Transitions'],'create'>
    >(
        client: Client, 
        transition: K,
        id: number,
        input: Input<S,K>
    ): Promise<void> {
        const obj = await this.readOneFromModel(client, this.$.Model, id);
        if (!obj) throw Exception.NotFound(id);
        return this.runFromModel(client, transition, obj, input);
    }

    /* Build */

    protected async build(
        client: Client,
        obj: Model<S>,
        schema: S['Output']|undefined = undefined,
        entity: Record<string, any> = {}
    ): Promise<T> {
        if (!schema) schema = this.$.Output;

        for (let key in schema) {
            const prop = schema![key];
            if (prop instanceof Prop) {
                if (prop.source != 'model') continue;
                if (prop.async)
                    entity[key] = await prop.fn(obj, client);
                else
                    entity[key] = prop.fn(obj, client);
                continue;
            }
            else if (prop instanceof GraphLink) {
                if (prop.many)
                    entity[key] = await this.buildLinkMany(client, obj, prop);
                else
                    entity[key] = await this.buildLinkSingle(client, obj, prop);
                continue;
            }
            entity[key] = {};
            await this.build(client, obj, schema[key] as any, entity[key]);
        }
        this.buildMethods(obj, entity);
        return entity as any;
    }
    
    private async buildAll(client: Client, objs: Model<S>[]): Promise<T[]> {
        return Promise.all(objs.map(
            async obj => this.build(client, obj)
        ));
    }

    private async buildLinkSingle<R extends ResourceMachine<any,S>>(
        client: Client,
        obj: Model<S>,
        link: GraphLink<R>
    ) {
        const fkey = link.resource.name(true) + '_id';
        return link.resource.readOne(client, (obj as any)[fkey]);
    }

    private async buildLinkMany<R extends ResourceMachine<any,S>>(
        client: Client,
        obj: Model<S>,
        link: GraphLink<R>
    ) {
        const fkey = this.name(true) + '_id';
        return link.resource.readOneGroup(client, fkey as any, obj.id);
    }

    protected buildMethods(
        obj: Model<S>,
        entity: Record<string, any>
    ) {
        Object.keys(this.$.Transitions).map(t => {
            if (t === 'create') return;
            entity[t] = async (client: Client, input: any) => {
                return this.runFromModel(client, t, obj, input);
            }
        })
    }

    /* Model */

    protected async readOneFromModel(
        client: Client,
        model: typeof BaseModel,
        id: number
    ) {
        let query = model.query();
        if (client.trx) query = query.useTransaction(client.trx);
        return query.where('id', id).first() as Model<S> | null;
    }

    protected async readAllFromModel(
        client: Client,
        model: typeof BaseModel
    ) {
        let query = model.query();
        if (client.trx) query = query.useTransaction(client.trx);
        return await query as Model<S>[];
    }

    protected async readOneGroupFromModel(
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
        return new this(`Não encontrado: ${id}`, Status.BADREQUEST, this.code);
    }

}