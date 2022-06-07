import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { Auth } from '../Auth';
import ResourceMachine from '../Resource/ResourceMachine';
import { BaseController, ControllerEndpoint, Middleware } from '.';
import { Schema } from '../Resource/Schema';
import { Settings } from '../Settings';
import { QueryBuilder } from '../Resource/Helpers/Query';

export type ControllerTransition<S extends Schema> = {
    transition: keyof Omit<S['Transitions'],'create'|'delete'>
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

        async readAll() {
            return resource.readAll(this.client);
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
            return QueryBuilder.fromRansack(this.client, resource, body.q).run();
        }
                
        static routes() {
            let path = '/' + this.route;

            this.$endpoints['readAll'] = {
                verb: 'get', path: path,
                auth, trx: true, version, middlewares: []
            }

            this.$endpoints['readOne'] = {
                verb: 'get', path: path+'/:id',
                auth, trx: true, version, middlewares: []
            }

            this.$endpoints['query'] = {
                verb: 'post', path: path + Settings.QUERY_ROUTE,
                auth, trx: true, version, middlewares: []
            }

            this.$endpoints['create'] = {
                verb: 'post', path,
                auth, trx: true, version, middlewares: []
            }

            if ('delete' in resource.$.Transitions) {
                this.$endpoints['delete'] = {
                    verb: 'delete', path: path+'/:id',
                    auth, trx: true, version, middlewares: []
                }
            }

            transitions.forEach(t => {
                const t_name = t.transition as string;
                const t_path = path+'/'+t.transition+'/:id';
                const t_auth = t.auth || auth;
                
                this.$endpoints[t_name] = {
                    verb: 'post', path: t_path,
                    auth: t_auth, version, middlewares: []
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