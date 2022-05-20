import * as R from ".";
import { Client } from "../Auth/Client";
import { Verb } from "../Service";
import Service from "../Service"
import { OutputSchema } from "./Schema";

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
        Route: string
        Format: (obj: Model) => T
        Output?: Output
        Transitions: Transitions
    }) => {
        return {
            Service: Service,
            Route: schema.Route,
            Format: schema.Format,
            Output: schema.Output || {} as Output,
            Transitions: schema.Transitions
        };
    }
}
export type Schema = {
    Service: typeof Service
    Route: string
    Format: (obj: any) => any
    Output: OutputSchema<any>
    Transitions: TransitionSchema
}


/**
    [Machine Type]
    Merges the given type properties with transition methods.
*/

export type Type<S extends Schema> = 
    ReturnType<S['Format']> &
    { [k in keyof S['Output']]: R.PropType<S['Output'][k]> } &
    Omit<{ [k in keyof S['Transitions']]: (input: TransitionInput<S['Transitions'][k]>) => Promise<void> }, 'create'>

/**
    [Service Machine]
    A custom State Machine for handling data in a service.
*/

export type Input<S extends Schema,T extends keyof S['Transitions']> = TransitionInput<S['Transitions'][T]>

export class Machine<T, S extends Schema> extends R.Machine<T,{
    Model: any
    Output: S['Output']
    States: any
    Transitions: Record<string, any>
}> {

    constructor($: Schema) {
        super({
            ...$,
            States: {}
        } as any);
    }

    name(snake_case = false): string {
        const route = (this.$ as any as Schema).Route;
        if (snake_case) return route;
        return route;
    }

    /* CRUD */

    async create(
        client: Client,
        input: Input<S,'create'>,
        extra?: Record<string,any>
    ): Promise<T> {
        return super.create(client, input, extra);
    }

    async createMany(
        client: Client,
        inputs: Input<S,'create'>[],
        extra?: (input: Input<S,'create'>) => Record<string,any>
    ): Promise<T[]> {
        return super.createMany(client, inputs, extra as any)
    }

    /* Build */

    protected async build(
        client: Client,
        obj: BaseModel,
        schema: S['Output']|undefined = undefined,
        entity: Record<string, any> = {}
    ): Promise<T> {
        if (!schema) entity = (this.$ as any as Schema).Format(obj);
        return super.build(client, obj, schema, entity);
    }

    /* Model */

    protected async readOneFromModel(
        client: Client,
        _: never,
        id: number
    ) {
        const $ = (this.$ as any as Schema);
        const url = $.Route + '/' + id;
        return $.Service.request(client, 'get', url) as any;
    }

    protected async readAllFromModel(
        client: Client,
        _: never
    ) {
        const $ = (this.$ as any as Schema);
        const url = $.Route + '/';
        return $.Service.request(client, 'get', url) as any;
    }

}
