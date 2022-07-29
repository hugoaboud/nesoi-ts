import { Client } from "src/Auth/Client";
import ResourceMachine from "../Machines/ResourceMachine";
import { StateMachine } from "../Machines/StateMachine";
import { GraphLink } from "../Props/Graph";
import { LambdaProp, Prop } from "../Props/Output";
import { Model, Schema } from "../Types/Schema";

export default class Builder<T, S extends Schema> {
    
    constructor(
        private machine: StateMachine<T,S>
    ) {}

    public async build(
        client: Client,
        obj: Model<S>,
        schema: S['Output']|undefined = undefined,
        entity: Record<string, any> = {}
    ): Promise<T> {
        if (!schema) schema = this.machine.$.Output;

        for (let key in schema) {
            const prop = schema![key];
            if (prop instanceof Prop) {
                if (prop.async)
                    entity[key] = await prop.fn(obj, prop);
                else
                    entity[key] = prop.fn(obj, prop);
                continue;
            }
            else if (prop instanceof GraphLink) {
                if (prop.many)
                    entity[key] = await this.buildLinkMany(client, obj, prop);
                else
                    entity[key] = await this.buildLinkSingle(client, obj, prop);
                continue;
            }
            else if (typeof prop === 'function') {
                entity[key] = null;
                continue;
            }
            entity[key] = {};
            await this.build(client, obj, schema[key] as any, entity[key]);
        }
        for (let key in schema) {
            const prop = schema![key] as LambdaProp<Model<S>>;
            if (typeof prop !== 'function') continue;
            entity[key] = prop(obj, {entity, client});
            if (typeof entity[key] === 'object' && 'then' in entity[key]) {
                entity[key] = await entity[key];
            }
        }
        this.buildMethods(obj, entity);
        return entity as any;
    }
    
    private async buildLinkSingle<R extends ResourceMachine<any,S>>(
        client: Client,
        obj: Model<S>,
        link: GraphLink<R>
    ) {
        const fkey = link.fkey!;

        try {
            const res = await link.resource.readOne(client, (obj as any)[fkey], true);
            if (!link.one_parser) return res;
            return link.one_parser(res);
        }
        catch {
            return {
                id: (obj as any)[fkey],
                __deleted__: true
            }
        }
    }

    private async buildLinkMany<R extends ResourceMachine<any,S>>(
        client: Client,
        obj: Model<S>,
        link: GraphLink<R>
    ) {
        const fkey = link.fkey || this.machine.name('lower_snake') + '_id';
        let res = await link.resource.readOneGroup(client, fkey as any, obj.id);
        if (link.parser) {
            res = link.parser(res);
        }
        if (link.sorter) res = res.sort(link.sorter);
        if (!link.one_parser) return res;
        return res.map(r => link.one_parser!(r));
    }

    protected buildMethods(
        obj: Model<S>,
        entity: Record<string, any>
    ) {
        Object.keys(this.machine.$.Transitions).map(t => {
            if (t === 'create') return;
            entity[t] = async (client: Client, input: any) => {
                return (this.machine as any).runFromModel(client, t, obj, input);
            }
        })
    }

}