import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { Auth } from '../Auth';
import ResourceMachine from '../Resource/ResourceMachine';
import { BaseController, ControllerEndpoint, Middleware } from '.';

/**
 * Resource Controller
 */

export function ResourceController<T>(
    resource: ResourceMachine<T,any>,
    base: string,
    auth: typeof Auth,
    version = 'v1'
) {

    return class extends BaseController {
        
        static $endpoints: Record<string, ControllerEndpoint> = {}
        static $middlewares:(typeof Middleware)[] = []
        static route = base

        async readAll(ctx: HttpContextContract) {
            return this.guard(ctx, true, () => 
                resource.readAll(this.client));
        }

        async readOne(ctx: HttpContextContract) {
            return this.guard(ctx, true, () => 
                resource.readOne(this.client, ctx.params.id));
        }

        async create(ctx: HttpContextContract) {
            return this.guard(ctx, true, () => 
                resource.create(this.client, ctx.request.body()));
        }
        
        static routes() {
            let path = '/' + this.route;

            this.$endpoints['readAll'] = {
                verb: 'get', path: path,
                auth, version, middlewares: []
            }

            this.$endpoints['readOne'] = {
                verb: 'get', path: path+'/:id',
                auth, version, middlewares: []
            }

            this.$endpoints['create'] = {
                verb: 'post', path,
                auth, version, middlewares: []
            }

            super.routes();
        }

    }
}