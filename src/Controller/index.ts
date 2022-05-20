import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Database from '@ioc:Adonis/Lucid/Database';
import { Auth } from '../Auth';
import { Verb } from '../Service';
import Route from '@ioc:Adonis/Core/Route'
import { Client } from '../Auth/Client';
import { ResourceController as $ResourceController } from './ResourceController';

export class Middleware {}

export interface ControllerEndpoint {
    verb: Verb
    path: string
    version: string
    auth: typeof Auth
    middlewares: string[]
}

export abstract class BaseController {

    static route: string

    client!: Client

    static $endpoints: Record<string, ControllerEndpoint>
    static $middlewares: (typeof Middleware)[]

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

    async guard(ctx: HttpContextContract, trx = true, fn: (ctx: HttpContextContract) => Promise<any>) {

        this.client = (ctx as any).client;
        
        if (!trx) return fn.bind(this)(ctx);

        return Database.transaction(async trx => {
            this.client.trx = trx;
            return fn.bind(this)(ctx);
        })

    }

}

/**
 * Decorates a Controller method as a route.
 */
 export function route(verb: Verb, path: string, auth:typeof Auth, trx = true, version = 'v1') {
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
        // Read client from ctx
        let fn = descriptor.value;
        descriptor.value = async function (this: any, ctx: HttpContextContract) {
            return this.guard(ctx, trx, fn);
        }
    }
}

/**
 * Decorates a Controller route method to use a middleware.
 */
export function middleware(type: typeof Middleware) {
    return function(target: any, key: string) { 
        let controller = (target.constructor as typeof BaseController);
        controller.$endpoints[key].middlewares.push(type.name)
    }
}

/** 
 * Regex for AdonisJS route to match ids with optional '.json' ending.
 * - /route/1 -> 1
 * - /route/1.json -> 1
 */
export const IdMatcher = { match: /^\d+(.json)?$/, cast: (id: string) => Number(id.replace('.json','')) };


/**
 * A Resource Controller
 */
export const ResourceController = $ResourceController