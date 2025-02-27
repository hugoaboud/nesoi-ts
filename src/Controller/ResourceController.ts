import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { Auth } from '../Auth';
import ResourceMachine from '../Resource/Machines/ResourceMachine';
import { BaseController, ControllerEndpoint } from '.';
import { Config } from '../Config';
import { QueryBuilder } from '../Resource/Helpers/Query';
import { Middleware } from '../Middleware';
import { Pagination } from '../Resource/Helpers/Pagination';
import { Schema } from '../Resource/Types/Schema';

export type ControllerTransition<S extends Schema> = {
    transition: keyof S['Transitions']
    auth?: typeof Auth
}

/**
 * Resource Controller
 */

export function ResourceController<T,S extends Schema>(
    resource: ResourceMachine<T,S>,
    base: string,
    auth: typeof Auth,
    transitions: ControllerTransition<S>[] = [],
    version = 'v1'
) {

    let c = class extends BaseController {
        
        static $endpoints: Record<string, ControllerEndpoint> = {}
        static $middlewares:(typeof Middleware)[] = []
        static route = base
        
        pagination?: Pagination

        async guard(ctx: HttpContextContract, schema: ControllerEndpoint, fn: (ctx: HttpContextContract) => Promise<any>) {

            const qs = ctx.request.qs();

            if ('page' in qs) {
                const order_by = qs.order_by?.split(',') || [];
                const order_desc = qs.order_desc?.split(',') || [];
                const order = order_by.map((column: string, i: number) => ({
                    column,
                    direction: (order_desc[i] === 'true') ? 'desc' : 'asc'
                }))
                this.pagination = new Pagination(parseInt(qs.page), parseInt(qs.per_page), order);
            }

            return super.guard(ctx, schema, fn);
        }

        async readAll(ctx: HttpContextContract) {
            const resources = await resource.readAll(this.client, this.pagination);
            this.pagination?.writeResponseHeaders(ctx);
            return resources;
        }

        async readOne(ctx: HttpContextContract) {
            return resource.readOne(this.client, ctx.params.id);
        }

        async create(ctx: HttpContextContract) {
            return resource.create(this.client, ctx.request.body() as any);
        }

        async delete(ctx: HttpContextContract) {
            return resource.run(this.client, 'delete' as any, ctx.params.id, ctx.request.body() as any);
        }

        async query(ctx: HttpContextContract) {
            const body = ctx.request.body();
            let query = QueryBuilder.fromRansack(this.client, resource, body.q)
            if (this.pagination) query = query.paginate(this.pagination)
            const resources = await query.all();
            this.pagination?.writeResponseHeaders(ctx);
            return resources;
        }

        async edit(ctx: HttpContextContract) {
            const input = {
                ...ctx.request.body(),
                id: ctx.params.id
            } as any;
            return resource.edit(this.client, input);
        }
                
        static routes() {
            let path = '/' + this.route;

            this.$endpoints['readAll'] = {
                method: 'readAll',
                verb: 'get', path: path,
                auth, trx: true, version, middlewares: []
            }

            this.$endpoints['readOne'] = {
                method: 'readOne',
                verb: 'get', path: path+'/:id',
                auth, trx: true, version, middlewares: []
            }

            this.$endpoints['query'] = {
                method: 'query',
                verb: 'post', path: path + Config.get('Routing').query_route,
                auth, trx: true, version, middlewares: []
            }

            const transition_keys = transitions.map(t => t.transition);

            if (
                transition_keys.includes('create')
            ) {
                const t = transitions.find(t => t.transition == 'create')
                const t_auth = t!.auth || auth
                this.$endpoints['create'] = {
                    method: 'create',
                    verb: 'post', path,
                    auth: t_auth, trx: true, version, middlewares: []
                }
            }
            
            if (
                transition_keys.includes('edit') &&
                'edit' in resource.$.Transitions
            ) {
                const t = transitions.find(t => t.transition == 'edit')
                const t_auth = t!.auth || auth
                this.$endpoints['edit'] = {
                    method: 'edit',
                    verb: Config.get('Routing').edit_verb, path: path+'/:id',
                    auth: t_auth, trx: true, version, middlewares: []
                }
            }
            
            if (
                transition_keys.includes('delete') &&
                'delete' in resource.$.Transitions
            ) {
                const t = transitions.find(t => t.transition == 'delete')
                const t_auth = t!.auth || auth
                this.$endpoints['delete'] = {
                    method: 'delete',
                    verb: 'delete', path: path+'/:id',
                    auth: t_auth, trx: true, version, middlewares: []
                }
            }

            transitions.forEach(t => {
                const t_name = t.transition as string;
                if (t_name === 'create' || t_name === 'edit' || t_name === 'delete') return;
                
                const t_path = path+'/:id/'+t_name
                const t_auth = t.auth || auth;
                
                this.$endpoints[t_name] = {
                    method: t_name,
                    verb: 'post', path: t_path,
                    auth: t_auth, trx: true, version, middlewares: []
                } as any

                (this.prototype as any)[t_name] = 
                    async function (ctx: HttpContextContract) {
                        return resource.run(this.client, t_name as any, ctx.request.param('id'), ctx.request.body() as any);
                    }
            })

            super.routes();
        }

    }

    return c;
}