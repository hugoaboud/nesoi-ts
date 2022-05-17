/*
	iCertus Framework
	[ Services/Service ]

	Handles authentication, requests and exceptions for external services.
*/

import axios from 'axios'
import ServiceException from '../Exception/ServiceException';
import { Status } from '../Exception';
import { ServiceHandler } from '../Resource/ServiceResource';
import Client, { DTO, URLParams } from '../Client';
import { User } from  '../Client/User';
import Console from '../Util/Console';
import { HandlerModel } from '../Resource';
import { Exception } from '@adonisjs/core/build/standalone';

/** REST verbs allowed for service requests. */
export type Verb = 'get'|'post'|'put'|'delete';

namespace $ {

    export type URL = {
        path: string,
        $: readonly string[]
    }

    export type Endpoint = {
        url: URL,
        query?: Record<string,string>,
        parse?: {
            index?: string
            byId?: string
        }
    }

}
export class URL {
    path: string
    $params?: readonly string[]

    constructor(
        schema: $.URL
    ) {
        this.path = schema.path;
        this.$params = schema.$;
    }

    build(params?: URLParams) {
        if (!this.$params?.length || !params) return this.path;

        let split = this.path.split('/');
        
        let p = 0;
        split = split.map(u => {
            if (u !== '$') return u;
            if (p < this.$params!.length)
                throw ServiceException.MissingEndpointURLParam('', this.path, p.toString());
            let param = params[this.$params![p]];
            if (!param)
                throw ServiceException.MissingEndpointURLParam('', this.path, param);
            p++;
            return param;
        })

        return split.join('/');
    }
}

export class Endpoint {

    url: URL
    query?: Record<string,string>
    parse: {
        index?: string[]
        byId?: string[]
    } = {}

    constructor(
        public name: string,
        schema: $.Endpoint
    ) {
        this.url = new URL(schema.url);
        this.query = schema.query;
        this.parse.index = schema.parse?.index?.split('.');
        this.parse.byId = schema.parse?.byId?.split('.');
    }

    parseIndex(obj: DTO): HandlerModel[] {
        if (!this.parse.index) return obj as HandlerModel[];
        this.parse.index.forEach(p => {
            obj = obj[p];
        })
        return obj as HandlerModel[];
    }

    parseById(obj: DTO): HandlerModel {
        if (!this.parse.byId) return obj as HandlerModel;
        this.parse.byId.forEach(p => {
            obj = obj[p];
        })
        return obj as HandlerModel;
    }
}

/**
 * Services are classes responsible for handling requests to 
 * external REST services.
 *   
 * This is an abstract base class, which should be extended to 
 * implement the desired behaviours for each service.
 */
export default abstract class Service {

    /** The human name of the Service, to be raised in exceptions. */
    static alias: string;

    /** The service base url, including port and prefixes. */
    static base_url: string;
    
    /** HTTP code for "Not Found" when reading by id. */
    static not_found_code: number = 422;

    /** Dictionary of endpoints for building handlers.
     *  Endpoints not defined here will fail on a client request.*/
    static resources: Record<string,$.Endpoint>

    /** Tokens used by the service */
    protected tokens: Record<string,string> = {}

    getAlias(): string {
        return (this.constructor as typeof Service).alias;
    }
    
    getBaseURL(): string {
        return (this.constructor as typeof Service).base_url;
    }
    
    /**
     * Log service requests. Used internally by the Service class.
     */
    log(verb: Verb, endpoint: string, id: any) {

        if (!Console.enabled()) return
        let verb_colored = Console.colored(verb.toUpperCase(), 'purple');
        let service = Console.colored('@'+this.getAlias(), 'cyan');

        let line = Console.line(verb_colored, service, `${service}/${endpoint}/${id || ''}`)
        console.log(line);
    }

}
