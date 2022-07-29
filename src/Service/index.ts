import axios, { AxiosError } from "axios";
import { Client } from "../Auth/Client";
import { Exception as BaseException } from '@adonisjs/core/build/standalone';
import Logger from '@ioc:Adonis/Core/Logger'

export enum Status {
    OK = 200,
    UNAUTHORIZED = 401,
    BADREQUEST = 422,
    INTERNAL_SERVER = 500,
    BAD_GATEWAY = 502
}

/** REST verbs allowed for service requests. */
export type Verb = 'get'|'post'|'put'|'delete'|'patch';

export default abstract class Service {

    /** The human name of the Service, to be raised in exceptions. */
    static alias: string;

    /** The service base url, including port and prefixes. */
    static base_url: string;
    
    /** HTTP code for "Not Found" when reading by id. */
    static not_found_code: number = Status.BADREQUEST;

    /** Suffix to append at the end of every url (used for old content negotiation strategies). */
    static suffix: string = '';

    static headers(client: Client) {
        return {
            ...client.tokens,
            'Content-Type': 'application/json'
        }
    }

    static handleException(_e: any) {}

    static routeReadOne(route: string, id: number) {
        return route + '/' + id;
    }
    static routeReadAll(route: string) {
        return route;
    }
    
    static async request(
        client: Client,
        verb: Verb,
        url: string,
        query?: Record<string,string>,
        body?: Record<string,any>
    ) {

        Logger.info(`(out) ${verb.toUpperCase()} ${url}`);

        const response = await axios({
            method: verb,
            baseURL: this.base_url,
            url: url + this.suffix,
            headers: this.headers(client),
            params: query,
            data: body
        }).catch(e => {
            this.handleException(e);
            if (e.response?.status === Status.UNAUTHORIZED)
                throw Exception.AuthFailed(this.alias);
            if (verb === 'get' && e.response?.status === this.not_found_code)
                return { data: null };
            throw Exception.RequestError(this.alias, e);
        })

        return response.data;
    }
    
}

class Exception extends BaseException {

    static code = 'E_STATE_MACHINE'

    static AuthFailed(service: string) {
        return new this(`<${service}> Falha de Autorização`, Status.UNAUTHORIZED, this.code)
    }

    static RequestError(service: string, error: AxiosError) {
        console.error(error);
        console.error(error.response?.data);

        const nesoi_error = error.response?.data?.errors;
        const msg = nesoi_error?.base ? nesoi_error.base.join(',') : error.message;

        const e = new this(`<${service}>: ${msg}`, Status.BAD_GATEWAY, this.code);
        (e as any).data = error.response?.data;
        throw e;
    }


}