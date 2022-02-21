import { TransactionClientContract } from "@ioc:Adonis/Lucid/Database";
import Client from "./Client";
import { DatabaseException, NodeException } from "./Exceptions";
import Validator, { isEmpty, ValidationSchema } from "./Validator";
import { DateTime } from "luxon";
import { NodeModel } from "./Model";
import { Prop } from "./Prop";
import { LucidModel } from "@ioc:Adonis/Lucid/Orm";

type Input = Record<string,any>
export type NodeBuilder = Record<string, Prop>
export type NodeEntity<Builder extends NodeBuilder> = {
    [key in keyof Builder]: any;
};

interface ExpandSchema extends Record<string,undefined|ExpandSchema> {}
export const DefaultExpand = undefined
export const DontExpand = {}

export type Groups<TEntity> = Record<string | number, TEntity[]>
export type TNode = new (client: Client, trx?: TransactionClientContract, expand?: ExpandSchema) => Node<any,any>

export default abstract class Node<Model extends NodeModel, Entity extends NodeEntity<any>> {
    
    static alias: string
    static model: LucidModel
    
    static schema?: ValidationSchema
    static builder: NodeBuilder
    static expand: ExpandSchema = {}

    constructor(
        public client: Client,
        public trx?: TransactionClientContract,
        public expand: ExpandSchema = DefaultExpand as any
    ) {
        if (this.expand == DefaultExpand) this.expand = (this.constructor as typeof Node).expand;
    }

    protected abstract doCreate(input: Input): Promise<Model>
    protected abstract doUpdate(model: Model, input: Input): Promise<Model>
    //protected afterBuild?(entity: TEntity): Promise<void>
    protected beforeDelete?(model: Model): Promise<void>
    
    async ReadOne(this: Node<Model, any>, id: number): Promise<Entity> {
        
        let obj = await this.queryByID(id);
        if (!obj) throw NodeException.NotFound(this.getAlias(), id);

        return this.Build(obj);
    }

    async ReadAll(this: Node<Model, any>): Promise<Entity[]> {
        let query = this.getModel().query({client: this.trx});
        if (!this.isStatic()) query = query.andWhereNull('deleted_at');

        let rows:Model[] = []
        try { rows = await query as Model[]; }
        catch (e: any) { throw DatabaseException(e); }

        return Promise.all(rows.map(row => this.Build(row)));
    }

    async ReadKeyValue(this: Node<Model, any>, key: string, value: string): Promise<Entity[]> {
        let query = this.getModel().query({client: this.trx}).where(key, value);
        if (!this.isStatic()) query = query.andWhereNull('deleted_at');
        
        let rows:Model[] = []
        try { rows = await query as Model[]; }
        catch (e: any) { throw DatabaseException(e); }

        return Promise.all(rows.map(row => this.Build(row)));
    }

    async ReadKeyValueIDs(this: Node<Model, any>, key: string, value: string): Promise<number[]> {
        let query = this.getModel().query({client: this.trx}).where(key, value);
        if (!this.isStatic()) query = query.andWhereNull('deleted_at');
        
        let rows:Model[] = []
        try { rows = await query as Model[]; }
        catch (e: any) { throw DatabaseException(e); }

        return rows.map(row => row.id);
    }

    async Create(this: Node<Model, any>, input: Input): Promise<Entity> {
        let schema = this.getSchema();
        if (!schema) return null as any;

        delete input['id'];

        let validator = new Validator(schema);
        await validator.Validate(this.getAlias(), input);

        let obj = await this.doCreate(input);
        obj.created_by = this.client.user_id;

        await obj.save();
        await obj.refresh();
        return this.Build(obj);
    }

    async Update(this: Node<Model, any>, id: number, input: Input): Promise<Entity> {
        let schema = this.getSchema();
        if (!schema) return null as any;

        input.id = id;
        let validator = new Validator(schema);
        await validator.Validate(this.getAlias(), input);

        let obj = await this.queryByID(id);
        if (!obj) throw NodeException.NotFound(this.getAlias(), id);

        obj = await this.doUpdate(obj, input);

        await obj.save();
        return this.Build(obj);
    }

    async Delete(id: number): Promise<void> {
        if (this.isStatic()) return null as any;

        let obj = await this.queryByID(id);
        if (!obj || !isEmpty(obj.deleted_at))
            throw NodeException.NotFound(this.getAlias(), id);

        obj.deleted_by = this.client.user_id;
        obj.deleted_at = DateTime.now();

        await obj.save();
    }

    async Exists(id: number, ..._args: any[]): Promise<boolean> {
        let obj = await this.queryByID(id);
        return (obj != null);
    }

    private getAlias(): string {
        return (this.constructor as typeof Node).alias;
    }
    private getModel(): LucidModel {
        return (this.constructor as typeof Node).model;
    }
    private getBuilder(): NodeBuilder {
        return (this.constructor as typeof Node).builder;
    }
    private getSchema(): ValidationSchema {
        return (this.constructor as typeof Node).schema!;
    }
    private isStatic(): boolean {
        return (this.constructor as typeof Node).schema == undefined;
    }

    private async queryByID(id: number): Promise<Model|null> {
        let query = this.getModel().query({client: this.trx}).where('id', id);

        let rows:Model[] = []
        try { rows = await query as Model[]; }
        catch (e: any) { throw DatabaseException(e); }
        if (!rows.length) return null;
        return rows[0];
    }

    private async Build(this: Node<Model,any>, model: Model): Promise<Entity> {
        if (!isEmpty(model.deleted_at) || !isEmpty(model.deleted_by)) {
            return {
                id: model.id,
                deleted: true
            } as any
        }

        let builder = this.getBuilder();
        let obj = {
            _t: this.constructor.name,
            id: model.id
        } as any

        // Ensure property order
        Object.keys(builder).forEach(key => obj[key] = undefined as any);

        // Model params
        await Promise.all(Object.keys(builder).map(async(key) => {
            let param = builder[key];
            if (param.source !== 'model') return;
            if (param.async) obj[key] = await param.fn(model, key, this)
            else obj[key] = param.fn(model, key, this)
        }))

        // TEntity params
        await Promise.all(Object.keys(builder).map(async(key) => {
            let param = builder[key];
            if (param.source !== 'entity') return;
            if (param.async) obj[key] = await param.fn(obj, key, this)
            else obj[key] = param.fn(obj, key, this)
        }))

        // Filter null parameters
        obj = Object.keys(obj).reduce((a:NodeBuilder,x) => {
            if (obj[x] != null) a[x] = obj[x];
            return a;
        }, {});

        return obj as Entity;
    }

}

