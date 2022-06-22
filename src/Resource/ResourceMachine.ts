import { Exception as BaseException } from '@adonisjs/core/build/standalone';
import { Model } from ".";
import { Status } from '../Service';
import { Client } from "../Auth/Client";
import { CamelToSnakeCase } from "../Util/String";
import { ResourceSchemaValidator } from "../Validator/ResourceSchemaValidator";
import { GraphLink } from "./Graph";
import { Input } from "./Input";
import BaseModel from "./Model";
import { Prop, $ as $Prop, LambdaProp } from "./Output";
import { Schema } from "./Schema";
import { StateMachine } from './StateMachine';
import { Query, QueryBuilder } from './Helpers/Query';
import { ColumnBasedMultiTenancy, MultiTenancy } from './Helpers/MultiTenancy';
import { Config } from '../Config';
import { Pagination } from './Helpers/Pagination';

/**
    [ Resource Machine ]
    A custom State Machine for handling data in a database.
*/

export default class ResourceMachine< T, S extends Schema > extends StateMachine<S>{

    private multi_tenancy!: MultiTenancy

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

        this.multi_tenancy = new ColumnBasedMultiTenancy(
            Config.get('MultiTenancy').column,
            Config.get('MultiTenancy').user_key
        );
    }

    name(snake_case = false): string {
        const name = this.$.Model.name.replace('Model','');
        if (!snake_case) return name;
        return CamelToSnakeCase(name);
    }

    /* Read */

    async readAll(client: Client, pagination?: Pagination): Promise<T[]> {
        const objs = await this.readAllFromModel(client, this.$.Model, pagination);
        return this.buildAll(client, objs);
    }

    async readOne(client: Client, id: number): Promise<T> {
        const obj = await this.readOneFromModel(client, this.$.Model, id);
        if (!obj) throw Exception.NotFound(id);
        return this.build(client, obj);
    }

    async readMany(client: Client, ids: number[]): Promise<T[]> {
        if (!ids.length) return [];
        return this.query(client).rule('id','in',ids).run();
    }

    async readOneGroup(client: Client, key: keyof Model<S>, id: number): Promise<T[]> {
        const objs = await this.readOneGroupFromModel(client, this.$.Model, key as string, id);
        return this.buildAll(client, objs);
    }
    
    /* Query */

    query(client: Client): QueryBuilder<T> {
        return new QueryBuilder<T>(client, this);
    }

    protected async runQuery(client: Client, query: QueryBuilder<T>): Promise<T[]> {
        const objs = await Query.run(client, query, {
            multi_tenancy: this.multi_tenancy
        });
        return this.buildAll(client, objs as any);
    }

    /* Create */

    async create(
        client: Client,
        input: Input<S,'create'>
    ): Promise<T> {
        const obj = new this.$.Model() as Model<S>;
        obj.state = 'void';
        await this.runFromModel(client, 'create', obj, input);
        return this.build(client, obj);
    }

    async createMany(
        client: Client,
        inputs: Input<S,'create'>[]
    ): Promise<T[]> {
        const objs = [] as T[];
        for (let i in inputs) {
            const input = inputs[i];
            const obj = await this.create(client, input);
            objs.push(obj);
        }
        return objs;
    }

    /* Edit */

    async edit(
        client: Client,
        input: {id?: number} & Input<S,'edit'>,
        parent_id?: number
    ): Promise<void> {
        if (!input.id) {
            await this.create(client, input);
            return;
        }
        const obj = await this.readOneFromModel(client, this.$.Model, input.id);
        if (!obj) throw Exception.NotFound(input.id);

        const parent = client.getAction(-1)?.resource as ResourceMachine<any,any>;
        if (parent && parent_id) {
            const parent_key = parent.name(true)+'_id';
            if ((obj as any)[parent_key] !== parent_id)
                throw Exception.EditSiblingResource(this.alias(), obj.id, parent.alias(), parent_id);
        }
        await this.runFromModel(client, 'edit', obj, input);
    }

    async editMany(
        client: Client,
        inputs: Input<S,'edit'>[],
        parent_id?: number
    ): Promise<void> {
        for (let i in inputs) {
            const input = inputs[i];
            await this.edit(client, input, parent_id);
        }
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
                if (prop.async)
                    entity[key] = await prop.fn(obj, prop);
                else
                    entity[key] = prop.fn(obj, prop);
                continue;
            }
            else if (prop instanceof GraphLink) {
                if (prop.many)
                    entity[key] = await this.buildLinkMany(client, obj, prop);
                else
                    entity[key] = await this.buildLinkSingle(client, obj, prop);
                continue;
            }
            else if (typeof prop === 'function') continue;
            entity[key] = {};
            await this.build(client, obj, schema[key] as any, entity[key]);
        }
        for (let key in schema) {
            const prop = schema![key] as LambdaProp<Model<S>>;
            if (typeof prop !== 'function') continue;
            if ('then' in prop) {
                entity[key] = await prop(obj, entity, client);
            }
            else {
                entity[key] = prop(obj, entity, client);
            }
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
        query = this.multi_tenancy.decorateReadQuery(client, query);
        query = query.whereNot('state', 'deleted');
        return query.where('id', id).first() as Model<S> | null;
    }

    protected async readAllFromModel(
        client: Client,
        model: typeof BaseModel,
        pagination?: Pagination
    ) {
        let query = model.query();
        if (client.trx) query = query.useTransaction(client.trx);
        query = this.multi_tenancy.decorateReadQuery(client, query);
        query = query.whereNot('state', 'deleted');
        if (pagination) query = pagination.decorateReadQuery(query);
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
        query = this.multi_tenancy.decorateReadQuery(client, query);
        query = query.whereNot('state', 'deleted');
        return await query.where(key, id) as Model<S>[];
    }

    async save(
        client: Client,
        obj: Model<S>,
        create: boolean
    ) {
        if (create)
            obj = this.multi_tenancy.decorateObjectBeforeSave(client, obj);
        obj.useTransaction(client.trx);
        await obj.save();
        await obj.refresh();
    }

}

class Exception extends BaseException {

    static code = 'E_RESOURCE'

    static NotFound(id: number) {
        return new this(`Não encontrado: ${id}`, Status.BADREQUEST, this.code);
    }

    static EditSiblingResource(alias: string, id: number, parent_alias: string, parent_id: number) {
        return new this(`${alias} ${id} não pertence a ${parent_alias} ${parent_id}`, Status.BADREQUEST, this.code);
    }

}