import axios, { AxiosError } from "axios";
import { Client } from "./Auth/Client";
import { Exception as BaseException } from '@adonisjs/core/build/standalone';

export enum Status {
    OK = 200,
    UNAUTHORIZED = 401,
    BADREQUEST = 422,
    INTERNAL_SERVER = 500
}

/** REST verbs allowed for service requests. */
export type Verb = 'get'|'post'|'put'|'delete';

export default abstract class Service {

    /** The human name of the Service, to be raised in exceptions. */
    static alias: string;

    /** The service base url, including port and prefixes. */
    static base_url: string;
    
    /** HTTP code for "Not Found" when reading by id. */
    static not_found_code: number = Status.BADREQUEST;

    /** Suffix to append at the end of every url (used for old content negotiation strategies). */
    static suffix: string = '';

    static async request(
        client: Client,
        verb: Verb,
        url: string,
        query?: Record<string,string>,
        body?: Record<string,any>
    ) {

        const response = await axios({
            method: verb,
            baseURL: this.base_url,
            url: url + this.suffix,
            headers: {
                ...client.tokens,
                'Content-Type': 'application/json'
            },
            params: query,
            data: body
        }).catch(e => {

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
        return new this(`<${service}>: ${error}`, error.response?.status, this.code)
    }


}