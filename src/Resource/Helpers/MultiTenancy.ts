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
        private user_param: string
    ) {}

    decorateObjectBeforeSave<T>(
        client: Client,
        obj: T
    ): T {
        (obj as any)[this.column] = (client.user as any)[this.user_param];
        return obj;
    }

    decorateReadQuery<Model extends typeof BaseModel>(
        client: Client,
        query: ModelQueryBuilderContract<Model, InstanceType<Model>>
    ): ModelQueryBuilderContract<Model, InstanceType<Model>> {
        return query.where(this.column, (client.user as any)[this.user_param]);
    }

}