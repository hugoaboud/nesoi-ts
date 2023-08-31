import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Database from '@ioc:Adonis/Lucid/Database';
import { Auth } from '../Auth';
import { Verb } from '../Service';
import Route from '@ioc:Adonis/Core/Route'
import { Client } from '../Auth/Client';
import { ResourceController as $ResourceController } from './ResourceController';
import { Middleware } from '../Middleware';
import { Config } from '../Config';

export interface ControllerEndpoint {
    method: string
    verb: Verb
    path: string
    version: string
    auth: typeof Auth
    trx: boolean
    middlewares: (typeof Middleware)[]
}

export abstract class BaseController {

    static route: string

    client!: Client

    static $endpoints: Record<string, ControllerEndpoint>
    static $middlewares: (typeof Middleware)[] = []

    static makeRoute(key: string, suffix?: string) {

        let schema = this.$endpoints[key];

        const method = async (ctx: HttpContextContract) => {
            const path = process.cwd()+'/app/Controllers/Http/'+this.name;
            const { default: Controller } = await import(path);
            const controller = new Controller() as BaseController;
            return controller.guard(ctx, schema, (controller as any)[key]);
        }

        const path = schema.path + (suffix || '')
        const route = Route[schema.verb](path, method);

        route.prefix(schema.version)
            
        route.middleware('LogMiddleware');
        if (schema.auth) route.middleware(schema.auth.name);
        
        this.$middlewares.forEach(middleware => 
            route.middleware(middleware.name))
        if (schema.middlewares)
            schema.middlewares.forEach(m => route.middleware(m.name))

        if (schema.path.endsWith(':id'))
            route.where('id', IdMatcher)
    } 

    static routes() {
        if (!this.$endpoints) return;

        const suffix = Config.get('Routing').suffix;

        Object.keys(this.$endpoints).forEach(key => {
            this.makeRoute(key);
            if (suffix && !this.$endpoints[key].path.endsWith(':id')) {
                this.makeRoute(key, suffix)
            }
        })

    }

    /** Setup client and transaction for the route */
    async guard(ctx: HttpContextContract, schema: ControllerEndpoint, fn: (ctx: HttpContextContract) => Promise<any>) {

        this.client = (ctx as any).client;
        
        if (!schema.trx) return fn.bind(this)(ctx);

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
    return function(target: any, key: string) { 
        // Register route
        let controller = (target.constructor as typeof BaseController);
        if (!controller.$endpoints) controller.$endpoints = {}
        controller.$endpoints[key] = {
            method: key,
            verb,
            path: controller.route+(path?('/'+path):''),
            version,
            auth,
            trx,
            middlewares: []
        }
        // // Read client from ctx
        // let fn = descriptor.value;
        // descriptor.value = async function (this: any, ctx: HttpContextContract) {
        //     return this.guard(ctx, trx, fn);
        // }
    }
}

/**
 * Decorates a Controller route method to use a middleware.
 */
export function middleware(type: typeof Middleware) {
    return function(target: any, key: string) { 
        let controller = (target.constructor as typeof BaseController);
        controller.$endpoints[key].middlewares.push(type)
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