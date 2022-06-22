import { Client } from "../Auth/Client";
import { Verb } from "../Service";
import Service from "../Service"
import { OutputSchema } from "./Schema";
import ResourceMachine from "./ResourceMachine";
import { PropType } from ".";
import { QueryBuilder } from "./Helpers/Query";
import { Config } from "../Config";
import { CamelToSnakeCase } from "../Util/String";

/* Model */

export interface BaseModel {
    id: number
    created_at: string
    updated_at: string
}   

/* Transition */

//@ts-ignore
export interface Transition<T> {
    verb: Verb
    url: string
}
export function Transition<T>(transition: Transition<T>) { return transition; }

type TransitionSchema = Record<string, Transition<any>>
type TransitionInput<T> = T extends Transition<infer X> ? X : never

/* Schema */

export function Schema<Model extends BaseModel>() {
    return <
        T,
        Output extends OutputSchema<Model>,
        Transitions extends TransitionSchema
    >(schema: {
        Service: typeof Service
        Version: string
        Name: string
        Alias: string
        Route: string
        Query?: Record<string,string>,
        Parse?: (obj: Model) => T
        Output?: Output
        Transitions: Transitions
    }) => {
        return class Schema implements Schema {
            Service!: typeof Service
            Version!: string
            Name!: string
            Alias!: string
            Route!: string
            Query!: Record<string,string>
            Parse!: (obj: Model) => T
            Output!: Output
            Transitions!: Transitions

            static $ = {
                Service: schema.Service,
                Version: schema.Version,
                Name: schema.Name,
                Alias: schema.Alias,
                Route: schema.Route,
                Parse: schema.Parse || (obj => obj),
                Query: schema.Query || {},
                Output: schema.Output || {},
                Transitions: schema.Transitions
            }
        };
    }
}

export type Schema = {
    Service: typeof Service
    Version: string
    Route: string
    Name: string
    Alias: string
    Query: Record<string,string>
    Parse:      (obj: any) => any
    Output: OutputSchema<any>
    Transitions: TransitionSchema
}

/**
    [Machine Type]
    Merges the given type properties with transition methods.
*/

export type Type<S extends Schema> = 
    ReturnType<NonNullable<S['Parse']>> &
    { [k in keyof S['Output']]: PropType<S['Output'][k]> } &
    Omit<{ [k in keyof S['Transitions']]: (input: TransitionInput<S['Transitions'][k]>) => Promise<void> }, 'create'>
    {}

/**
    [Service Machine]
    A custom State Machine for handling data in a service.
*/

export type Input<S extends Schema,T extends keyof S['Transitions']> = TransitionInput<S['Transitions'][T]>

export class Machine<T, S extends Schema> extends ResourceMachine<T,{
    Model: any
    Alias: string
    Output: S['Output']
    States: any
    Transitions: any
    Hooks: any
}> {

    constructor($: Schema) {
        super({
            ...$,
            States: {}
        } as any);
    }

    name(snake_case = false): string {
        const route = (this.$ as any as Schema).Name;
        if (!snake_case) return route;
        return CamelToSnakeCase(route);
    }

    private route() {
        const $ = (this.$ as any as Schema);
        return $.Version + '/' + $.Route;
    }

    /* Query */

    query(client: Client): QueryBuilder<T> {
        return new QueryBuilder(client, this, true);
    }

    protected async runQuery(client: Client, query: QueryBuilder<T>): Promise<T[]> {
        const $ = (this.$ as any as Schema);
        const q = (query as any).toRansack();
        const url = this.route() + Config.get('Routing').query_route;
        return $.Service.request(client, 'post', url, $.Query, { q });
    }

    /* Create */

    async create(
        client: Client,
        input: Input<S,'create'>
    ): Promise<T> {
        const $ = (this.$ as any as Schema);
        const url = this.route();
        return $.Service.request(client, 'post', url, undefined, input);
    }

    async createMany(
        client: Client,
        inputs: Input<S,'create'>[]
    ): Promise<T[]> {
        const objs = [];
        for (let i in inputs) {
            const obj = await this.create(client, inputs[i]);
            objs.push(obj);
        }
        return objs;
    }

    /* Edit */

    async edit(
        client: Client,
        input: {id?: number} & Input<S,'edit'>
    ): Promise<void> {
        if (!input.id) {
            await this.create(client, input as any);
            return;
        }
        const $ = (this.$ as any as Schema);
        const url = this.route() + '/' + input.id;
        return $.Service.request(client, Config.get('Routing').edit_verb, url, undefined, input);
    }

    async editMany(
        client: Client,
        inputs: ({id?: number} & Input<S,'edit'>)[]
    ): Promise<void> {
        for (let i in inputs) {
            await this.edit(client, inputs[i]);
        }
    }

    /* Build */

    protected async build(
        client: Client,
        obj: BaseModel,
        schema: S['Output']|undefined = undefined,
        entity: Record<string, any> = {}
    ): Promise<T> {
        if (!schema) entity = (this.$ as any as Schema).Parse(obj);
        return super.build(client, obj, schema, entity);
    }

    /* Model */

    protected async readOneFromModel(
        client: Client,
        _: never,
        id: number
    ) {
        const $ = (this.$ as any as Schema);
        const url = this.route() + '/' + id;
        return $.Service.request(client, 'get', url, $.Query) as any;
    }

    protected async readAllFromModel(
        client: Client,
        _: never
    ) {
        const $ = (this.$ as any as Schema);
        const url = this.route();
        return $.Service.request(client, 'get', url, $.Query) as any;
    }

}