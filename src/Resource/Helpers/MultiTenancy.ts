import { ModelQueryBuilderContract } from "@ioc:Adonis/Lucid/Orm";
import { Client, User } from "../../Auth/Client";
import BaseModel from "../Model";

export abstract class MultiTenancy {

    abstract decorateObjectBeforeSave<T>(
        client: Client,
        query: T
    ): T

    abstract decorateReadQuery(
        client: Client,
        query: ModelQueryBuilderContract<typeof BaseModel, BaseModel>
    ): ModelQueryBuilderContract<typeof BaseModel, BaseModel>

}

export class ColumnBasedMultiTenancy {

    constructor(
        private column: string,
        private user_param: keyof User
    ) {}

    decorateObjectBeforeSave<T>(
        client: Client,
        obj: T
    ): T {
        (obj as any)[this.column] = (client.user as any)[this.user_param];
        return obj;
    }

    decorateReadQuery(
        client: Client,
        query: ModelQueryBuilderContract<typeof BaseModel, BaseModel>
    ): ModelQueryBuilderContract<typeof BaseModel, BaseModel> {
        return query.where(this.column, client.user[this.user_param]);
    }

}