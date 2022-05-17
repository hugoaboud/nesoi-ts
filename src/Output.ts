
/*
   [ Props ]
   Props are values which belong to a Resource Entity.
   Such values are built from the database object.
*/

import Service from "./Util/Service"

type PropSource = 'model'|'entity'

//@ts-ignore: The T parameter is used to infer the property type.
export class PropSchema<Model, T> {    
    constructor(
        public source: PropSource,
        public prop: keyof Model,
        public fn: (obj: Model) => any,
        public list?: boolean,
        public async = false
    ) {}
}

export function Prop<Model>() {
    return (prop: keyof Model, source: PropSource = 'model') => ({
        boolean: new PropSchema<Model, boolean>(source, prop, (obj: Model) => {
            return obj[prop]
        }),
        int: new PropSchema<Model, number>(source, prop, (obj: Model) => {
            return parseInt(obj[prop] as any)
        }),
        decimal: new PropSchema<Model, number>(source, prop, (obj: Model) => {
            return obj[prop]
        }),
        string: new PropSchema<Model, string>(source, prop, (obj: Model) => {
            return obj[prop]
        }),
        money: new PropSchema<Model, string>(source, prop, (obj: Model) => {
            return '' + obj[prop]
        }),
        serviceObj: <T extends typeof Service>(_service: T, _resource: keyof T['resources']): PropSchema<Model, Record<string,any>> =>
            new PropSchema<Model, Record<string,any>>(source, prop, (obj: Model) => {
                return obj[prop]
            }, false, true),
        serviceList: <T extends typeof Service>(_service: T, _resource: keyof T['resources']): PropSchema<Model, Record<string,any>[]> =>
            new PropSchema<Model, Record<string,any>[]>(source, prop, (obj: Model) => {
                return obj[prop]
            }, true, true),
    })
}

export interface OutputSchema<Model> {
    [name: string]: PropSchema<Model, any> | OutputSchema<Model>
}

export type PropType<T> = T extends PropSchema<any, infer X> ? X : {[k in keyof T]: PropType<T[k]>}