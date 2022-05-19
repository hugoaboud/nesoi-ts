
/*
   [ Props ]
   Props are values which belong to a Resource Entity.
   Such values are built from the database object.
*/

import { Machine, Type } from "."
import { GraphLinkSchema } from "./Graph"
import { Client } from "../Util/Auth"

type OutputType = 'boolean'|'int'|'decimal'|'string'|'money'|'child'|'children'|'serviceChild'|'serviceChildren'
type PropSource = 'model'|'entity'

//@ts-ignore: The T parameter is used to infer the property type.
export class PropSchema<Model, T> {    
    constructor(
        public type: OutputType,
        public source: PropSource,
        public prop: keyof Model,
        public fn: (obj: Model, client: Client) => any,
        public list?: boolean,
        public async = false
    ) {}
}

export function Prop<Model>() {
    return (prop: keyof Model, source: PropSource = 'model') => ({
        boolean: new PropSchema<Model, boolean>('boolean', source, prop, (obj: Model) => {
            return obj[prop]
        }),
        int: new PropSchema<Model, number>('int', source, prop, (obj: Model) => {
            return parseInt(obj[prop] as any)
        }),
        decimal: new PropSchema<Model, number>('decimal', source, prop, (obj: Model) => {
            return obj[prop]
        }),
        string: new PropSchema<Model, string>('string', source, prop, (obj: Model) => {
            return obj[prop]
        }),
        money: new PropSchema<Model, string>('money', source, prop, (obj: Model) => {
            return (obj as any).coin + obj[prop]
        }),

        child: <R extends Machine<any,any>>(resource: R) =>
            new PropSchema<Model, Type<R['$']>>('child', source, prop, (obj: Model, client) => {
                return resource.readOne(client, obj[prop] as any)
            }, false, true)

    })
}

export interface OutputSchema<Model> {
    [name: string]: PropSchema<Model, any> | GraphLinkSchema<any> | OutputSchema<Model>
}

export type PropType<T> = T extends PropSchema<any, infer X> ? X : {[k in keyof T]: PropType<T[k]>}