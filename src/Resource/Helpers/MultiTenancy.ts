import { ModelQueryBuilderContract } from "@ioc:Adonis/Lucid/Orm";
import { Client } from "../../Auth/Client";
import BaseModel from "../Model";

export abstract class MultiTenancy {

    abstract decorateObjectBeforeSave<T>(
        client: Client,
        query: T
    ): T

    abstract decorateReadQuery<Model extends typeof BaseModel>(
        client: Client,
        query: ModelQueryBuilderContract<Model, InstanceType<Model>>
    ): ModelQueryBuilderContract<Model, InstanceType<Model>>

}

export class ColumnBasedMultiTenancy {

    constructor(
        private column: string,
        private read_param: string,
        private save_param?: string
    ) {}

    decorateObjectBeforeSave<T>(
        client: Client,
        obj: T
    ): T {
        if (this.save_param)
            (obj as any)[this.column] = (client.user as any)[this.save_param];
        return obj;
    }

    decorateReadQuery<Model extends typeof BaseModel>(
        client: Client,
        query: ModelQueryBuilderContract<Model, InstanceType<Model>>
    ): ModelQueryBuilderContract<Model, InstanceType<Model>> {
        const param = (client.user as any)[this.read_param];
        if (Array.isArray(param))
            return query.whereIn(this.column, param);
        return query.where(this.column, param);
    }

}