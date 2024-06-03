import { Status } from '../../Service';
import { Client } from "../../Auth/Client";
import { CamelToSnakeCase } from "../../Util/String";
import { ResourceSchemaValidator } from "../../Validator/ResourceSchemaValidator";
import BaseModel, { Tenancy } from "../Model";
import { StateMachine } from './StateMachine';
import { Query, QueryBuilder } from '../Helpers/Query';
import { Pagination } from '../Helpers/Pagination';
import { Model, Schema } from '../Types/Schema';
import { $ as $Prop } from '../Props/Output';
import { Input } from '../Types/Entity';
import { Exception as BaseException } from './StateMachine';
import { Config } from '../../Config';

/**
    [ Resource Machine ]
    A custom State Machine for handling data in a database.
*/

export default class ResourceMachine< T, S extends Schema > extends StateMachine<T, S>{

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

    name(format: 'UpperCamel' | 'lower_snake' | 'UPPER_SNAKE' = 'UpperCamel'): string {
        const name = this.$.Model.name.replace('Model','');
        if (format === 'UpperCamel') return name;
        const snake = CamelToSnakeCase(name);
        if (format === 'lower_snake') return snake;
        return snake.toUpperCase();
    }

    /* Read */

    async readAll(client: Client, pagination?: Pagination): Promise<T[]> {
        const objs = await this.readAllFromModel(client, this.$.Model, pagination);
        return this.buildAll(client, objs);
    }

    async readOne(client: Client, id: number, cache = false, tenancy: Tenancy = 'default'): Promise<T> {
        if (cache) {
            return client.getCache().readOne(this, id, tenancy) as any;
        }
        const obj = await this.readOneFromModel(client, this.$.Model, id, tenancy);
        if (!obj) throw Exception.NotFound(this, id);
        return this.build(client, obj);
    }

    async readMany(client: Client, ids: number[], tenancy: Tenancy = 'default'): Promise<T[]> {
        if (!ids.length) return [];
        let query = this.query(client)
        if (tenancy === 'default') query = query.noTenancy()
        return query.rule('id','in',ids).all();
    }

    async readOneGroup(client: Client, key: keyof Model<S>, value: string | number, tenancy: Tenancy = 'default'): Promise<T[]> {
        const objs = await this.readOneGroupFromModel(client, this.$.Model, key as string, value, tenancy);
        return this.buildAll(client, objs);
    }
    
    /* Query */

    query(client: Client): QueryBuilder<T> {
        return new QueryBuilder<T>(client, this);
    }

    protected async runQuery(client: Client, query: QueryBuilder<T>): Promise<T[]> {
        const objs = await Query.run(client, query);
        client.getCache().injectModelObjs(this.$.Model, objs);
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
        return this.builder.build(client, obj);
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

    /* Delete */

    async delete(
        client: Client,
        input: Input<S,'delete'>
    ): Promise<void> {
        await this.run(client, 'delete' as any, (input as any).id, input);
    }

    async deleteMany(
        client: Client,
        inputs: Input<S,'delete'>[]
    ): Promise<void> {
        for (let i in inputs) {
            const input = inputs[i];
            await this.delete(client, input);
        }
    }

    /* Edit */

    async edit(
        client: Client,
        input: {id?: number} & Input<S,'edit'>,
        parent_id?: number
    ): Promise<void> {
        if (!input.id) {
            await this.create(client, input as any);
            return;
        }
        const delete_flag = Config.get('Machine').delete_on_edit_flag;
        if (delete_flag.length && (input as any)[delete_flag]) {
            await this.delete(client, input as any);
            return;
        }
         const obj = await this.readOneFromModel(client, this.$.Model, input.id);
        if (!obj) throw Exception.NotFound(this, input.id);

        const parent = client.getAction(-1)?.machine as ResourceMachine<any,any>;
        if (parent && parent_id) {
            const parent_key = parent.name('lower_snake')+'_id';
            if ((obj as any)[parent_key] !== parent_id)
                throw Exception.EditSiblingResource(this, obj.id, parent.alias(), parent_id);
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
        if (!obj) throw Exception.NotFound(this, id);
        return this.runFromModel(client, transition, obj, input);
    }

    /* Model */

    protected async readOneFromModel(
        client: Client,
        model: typeof BaseModel,
        id: number,
        tenancy: Tenancy = 'default'
    ) {
        return model.readOne(client, id, tenancy) as Promise<Model<S> | null>;
    }

    protected async readAllFromModel(
        client: Client,
        model: typeof BaseModel,
        pagination?: Pagination,
        tenancy: Tenancy = 'default'
    ) {
        return model.readAll(client, pagination, tenancy) as Promise<Model<S>[]>;
    }

    protected async readOneGroupFromModel(
        client: Client,
        model: typeof BaseModel,
        key: string,
        value: string|number,
        tenancy: Tenancy = 'default'
    ) {
        return model.readOneGroup(client, key, value, tenancy) as Promise<Model<S>[]>;
    }

    protected async save(
        client: Client,
        obj: Model<S>,
        create: boolean
    ) {
        const model = obj.constructor as typeof BaseModel;
        if (create && model.multi_tenancy)
            obj = model.multi_tenancy.decorateObjectBeforeSave(client, obj);
        obj.useTransaction(client.trx);
        await obj.save();
        await obj.refresh();
    }

    protected async hardDelete(
        client: Client,
        id: number
    ) {
        const obj = await this.readOneFromModel(client, this.$.Model, id);
        if (!obj) throw Exception.NotFound(this, id);
        obj.useTransaction(client.trx);
        await obj.delete();
    }

}

class Exception extends BaseException {

    static NotFound(machine: ResourceMachine<any,any>, id: number) {
        return new this(machine, `${machine.alias()} não encontrado(a): ${id}`, Status.BADREQUEST);
    }

    static EditSiblingResource(machine: ResourceMachine<any,any>, id: number, parent_alias: string, parent_id: number) {
        return new this(machine, `${machine.alias()} ${id} não pertence a ${parent_alias} ${parent_id}`, Status.BADREQUEST);
    }

}