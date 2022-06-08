import { ModelQueryBuilderContract } from "@ioc:Adonis/Lucid/Orm";
import BaseModel from "../Model";

interface OrderBy {
    column: string,
    direction: 'asc'|'desc'
}

export class Pagination {

    private per_page = 10;

    constructor(
        private page = 1,
        per_page?: number,
        private order_by?: OrderBy[]
    ) {
        if (per_page) this.per_page = per_page;
    }

    decorateReadQuery(
        query: ModelQueryBuilderContract<typeof BaseModel, BaseModel>
    ): ModelQueryBuilderContract<typeof BaseModel, BaseModel> {

        query = query.limit(this.per_page).offset((this.page-1)*this.per_page);
        if (this.order_by) {
            this.order_by.forEach(order => {
                query = query.orderBy(order.column, order.direction)
            })
        }
        return query; 
    }

}