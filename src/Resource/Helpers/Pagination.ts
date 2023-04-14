import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { ModelQueryBuilderContract } from "@ioc:Adonis/Lucid/Orm";
import BaseModel from "../Model";

interface OrderBy {
    column: string,
    direction: 'asc'|'desc'
}

export class Pagination {

    private per_page = 10;
    private total_count = 0;

    constructor(
        private page = 1,
        per_page?: number,
        private order_by?: OrderBy[]
    ) {
        if (per_page) this.per_page = per_page;
    }

    async storeQueryTotalCount<Model extends typeof BaseModel>(
        query: ModelQueryBuilderContract<Model, InstanceType<Model>>
    ) {
        this.total_count = (await query.clone().count('* as total'))[0].$extras.total;
    }

    decorateReadQuery<Model extends typeof BaseModel>(
        query: ModelQueryBuilderContract<Model, InstanceType<Model>>
    ): ModelQueryBuilderContract<Model, InstanceType<Model>> {

        query = query.limit(this.per_page).offset((this.page-1)*this.per_page);
        if (this.order_by) {
            this.order_by.forEach(order => {
                query = query.orderBy(order.column, order.direction)
            })
        }
        return query; 
    }

    writeResponseHeaders(
        ctx: HttpContextContract
    ) {
        ctx.response.header('pagination-count', this.total_count)
        ctx.response.header('pagination-page', this.page)
        ctx.response.header('pagination-per_page', this.per_page)
    }

}