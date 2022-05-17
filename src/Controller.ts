import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Database, { TransactionClientContract } from '@ioc:Adonis/Lucid/Database';
import { Client, EndpointAuth } from './Util/Auth';
import { Verb } from './Util/Service';
import Route from '@ioc:Adonis/Core/Route'
import { Resource } from '.';

export class Middleware {}

interface Endpoint {
    verb: Verb
    path: string
    version: string
    auth?: typeof EndpointAuth
    middlewares: string[]
}

export abstract class BaseController {

    static route: string

    client!: Client
    trx?: TransactionClientContract

    static $endpoints: Record<string, Endpoint> = {}
    static $middlewares:(typeof Middleware)[] = []

    static routes() {
        Object.keys(this.$endpoints).forEach(key => {
            
            let $route = this.$endpoints[key];
            let route = Route[$route.verb]($route.path, this.name+'.'+key);

            route.prefix($route.version)
            if ($route.auth) route.middleware($route.auth.name);

            this.$middlewares.forEach(middleware => 
                route.middleware(middleware.name))

            if ($route.middlewares)
                $route.middlewares.forEach(name => route.middleware(name))

            if ($route.path.endsWith(':id'))
                route.where('id', IdMatcher)

        })

    }

}

/**
 * Decorates a Controller method as a route.
 */
 export function route(verb: Verb, path: string, auth?:typeof EndpointAuth, version = 'v1') {
    return function(target: any, key: string, descriptor: any) { 
        // Register route
        let controller = (target.constructor as typeof BaseController);
        controller.$endpoints[key] = {
            verb,
            path: controller.route+path,
            version,
            auth,
            middlewares: []
        }
        // Read client from ctx (created by auth middleware)
        let fn = descriptor.value;
        descriptor.value = async function (this: any, ctx: HttpContextContract) {
            this.client = (ctx as any).client;
            return fn.bind(this)(ctx);
        }
    }
}

/**
 * Decorates a Controller route method to use a middleware.
 */
 export function middleware(type: typeof Middleware) {
    return function(target: any, key: string) { 
        // Register route
        let controller = (target.constructor as typeof BaseController);
        controller.$endpoints[key].middlewares.push(type.name)
    }
}

/**
 * Decorates a Controller method as a database route.
 * - Set up a managed transaction for the route
 * - Optionally, setup the CRUDController route handler
 */
export function db() {
    return function(_target: any, _key: string, descriptor: any) { 
        let fn = descriptor.value;
        descriptor.value = async function (this: any, ctx: HttpContextContract) {
            await Database.transaction(async trx => {
                this.trx = trx;
                return fn.bind(this)(ctx);
            })
        }
    }
}

/** 
 * Regex for AdonisJS route to match ids with optional '.json' ending.
 * - /route/1 -> 1
 * - /route/1.json -> 1
 */
export const IdMatcher = { match: /^\d+(.json)?$/, cast: (id: string) => Number(id.replace('.json','')) };

/**
 * Resource Controller
 */

export function ResourceController<T>(resource: Resource<T,any>, route: string) {

    return class extends BaseController {
        
        static route = route

        async readOne(ctx: HttpContextContract) {
            return resource.readOne(ctx.params.id);
        }

        async create(ctx: HttpContextContract) {
            return resource.create(ctx.request.body());
        }
        
    }
}