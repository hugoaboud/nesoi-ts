import { Type } from "."
import { Client } from "../Auth/Client"
import ResourceMachine from "./ResourceMachine"

type PropType = 'boolean'|'int'|'decimal'|'string'|'money'|'child'|'children'|'serviceChild'|'serviceChildren'
type PropSource = 'model'|'entity'

/**
   [ Resource Prop ]
   Type of an (Output) Prop.
*/

//@ts-ignore: The T parameter is used to infer the property type.
export class Prop<Model, T> {    
    constructor(
        public type: PropType,
        public source: PropSource,
        public prop: keyof Model,
        public fn: (obj: Model, client: Client) => any,
        public list?: boolean,
        public async = false
    ) {}
}

/**
   [ Resource Output Prop $ ]
   Entry point for the Output Prop.
*/

export function $<Model>() {
    return (prop: keyof Model, source: PropSource = 'model') => ({
        boolean: new Prop<Model, boolean>('boolean', source, prop, (obj: Model) => {
            return obj[prop]
        }),
        int: new Prop<Model, number>('int', source, prop, (obj: Model) => {
            return parseInt(obj[prop] as any)
        }),
        decimal: new Prop<Model, number>('decimal', source, prop, (obj: Model) => {
            return obj[prop]
        }),
        string: new Prop<Model, string>('string', source, prop, (obj: Model) => {
            return obj[prop]
        }),
        money: new Prop<Model, string>('money', source, prop, (obj: Model) => {
            return (obj as any).coin + obj[prop]
        }),

        child: <R extends ResourceMachine<any,any>>(resource: R) =>
            new Prop<Model, Type<R['$']>>('child', source, prop, (obj: Model, client) => {
                return resource.readOne(client, obj[prop] as any)
            }, false, true)

    })
}