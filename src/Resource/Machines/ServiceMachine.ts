import { Client } from "../../Auth/Client";
import ResourceMachine from "./ResourceMachine";
import { QueryBuilder } from "../Helpers/Query";
import { Config } from "../../Config";
import { CamelToSnakeCase, URLparams } from "../../Util/String";

import Log from '../../Log';
import { BaseModel, Input, Schema } from "../Types/Service";
import { Exception } from "./StateMachine";
// import { Transition as LocalTransition } from "./StateMachine";

export default class ServiceMachine<T, S extends Schema> extends ResourceMachine<T,{
    Model: any
    Alias: string
    Output: NonNullable<S['Output']>
    States: any
    Transitions: { [x in keyof S['Transitions']]: any }
    Hooks: any
    Service: S['Service']
    Version: S['Version']
    Route: S['Route']
    Name: S['Name']
    Parse: S['Parse']
}> {

    constructor($: Schema) {
        super({
            ...$,
            States: {}
        } as any);
    }

    name(format: 'UpperCamel' | 'lower_snake' | 'UPPER_SNAKE' = 'UpperCamel'): string {
        const name = (this.$ as any as Schema).Name;
        if (format === 'UpperCamel') return name;
        const snake = CamelToSnakeCase(name);
        if (format === 'lower_snake') return snake;
        return snake.toUpperCase();
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
        const obj = {} as BaseModel;
        await this.runFromModel(client, 'create', obj, input);
        return this.build(client, obj);
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
        await this.runFromModel(client, 'edit', { id: input.id }, input);
    }

    async editMany(
        client: Client,
        inputs: ({id?: number} & Input<S,'edit'>)[]
    ): Promise<void> {
        for (let i in inputs) {
            await this.edit(client, inputs[i]);
        }
    }

    /* Model */

    protected async readOneFromModel(
        client: Client,
        _: never,
        id: number
    ) {
        const $ = (this.$ as any as Schema);
        const url = $.Service.routeReadOne(this.route(),id);
        const obj = await $.Service.request(client, 'get', url, $.Query) as any;
        return $.Parse(obj);
    }

    protected async readAllFromModel(
        client: Client,
        _: never
    ) {
        const $ = (this.$ as any as Schema);
        const url = $.Service.routeReadAll(this.route());
        const objs = await $.Service.request(client, 'get', url, $.Query) as any;
        return objs.map((obj: any) => $.Parse(obj));
    }

    async run(
        client: Client, 
        transition: any,
        id: number,
        input: Input<S,any>
    ): Promise<void> {
        return this.runFromModel(client, transition, { id }, input);
    }

    protected async runFromModel(
        client: Client, 
        t: keyof S['Transitions'],
        obj : Record<string,any>,
        input: Record<string,any>
    ): Promise<void> {

        const $ = (this.$ as any as Schema);
        
        const trans = $.Transitions[t as any];
        if (!trans) throw Exception.InvalidTransition(this, t as any);

        client.pushAction(this as any, obj, t);

        // Transition
        if ('url' in trans) {
            const verb = trans.verb;
            let url = this.route() + trans.url;
            URLparams(url).forEach(param => {
                url = url.replace(':'+param, input[param] );
            })
            
            const response = await $.Service.request(client, verb, url, $.Query, input) as any;
            if (t === 'create') {
                Object.assign(obj, $.Parse(response));
            }
        }
        // LambdaTransition
        else {
            await this.validator.sanitize(client, t, input);
            await this.validator.validate(client, t, input);

            await trans.fn(obj, { client, input, parent: client.getAction(-2)?.model, build: this.builder.build.bind(this) as any })
        }

        const last = client.getAction(-2);
        const origin = last ? last.machine.name() + '.' + (last.transition as string) : ''
        await Log(this as any, obj.id, client)
            .info(t as string, origin, `'${String(t)}' ${this.alias()} id:${obj.id}`, input);

        client.popAction();

        if (t !== 'create' && obj.id) {
            const model = await this.readOneFromModel(client, null as never, obj.id);
            Object.assign(obj, model);
        }
    }

    /* Build */

    protected async build(client: Client, obj: any): Promise<T> {
        const entity = Object.assign({}, obj);
        return this.builder.build(client, obj, undefined, entity);
    }
    
}