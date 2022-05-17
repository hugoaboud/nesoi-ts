/** REST verbs allowed for service requests. */
export type Verb = 'get'|'post'|'put'|'delete';


export default abstract class Service {

    /** The human name of the Service, to be raised in exceptions. */
    static alias: string;

    /** The service base url, including port and prefixes. */
    static base_url: string;
    
    /** HTTP code for "Not Found" when reading by id. */
    static not_found_code: number = 422;

    /** Dictionary of endpoints for building handlers.
     *  Endpoints not defined here will fail on a client request.*/
    static resources: Record<string,any>

    /** Tokens used by the service */
    protected tokens: Record<string,string> = {}

    getAlias(): string {
        return (this.constructor as typeof Service).alias;
    }
    
    getBaseURL(): string {
        return (this.constructor as typeof Service).base_url;
    }
    
}
