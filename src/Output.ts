
/*
   [ Props ]
   Props are values which belong to a Resource Entity.
   Such values are built from the database object.
*/

import Service from "./Service"

type PropSource = 'model'|'entity'

//@ts-ignore: The T parameter is used to infer the property type.
export class PropSchema<Model, T> {    
    constructor(
        protected source: PropSource,
        protected prop: keyof Model,
        protected fn: (model: Model) => any,
        protected list?: boolean
    ) {}
}

export function Prop<Model>() {
    return (prop: keyof Model, source: PropSource = 'model') => ({
        boolean: new PropSchema<Model, boolean>(source, prop, (model: Model) => {
            return model[prop]
        }),
        int: new PropSchema<Model, number>(source, prop, (model: Model) => {
            return parseInt(model[prop] as any)
        }),
        decimal: new PropSchema<Model, number>(source, prop, (model: Model) => {
            return model[prop]
        }),
        string: new PropSchema<Model, string>(source, prop, (model: Model) => {
            return model[prop]
        }),
        money: new PropSchema<Model, string>(source, prop, (model: Model) => {
            return model[prop]
        }),
        serviceObj: <T extends typeof Service>(_service: T, _resource: keyof T['resources']): PropSchema<Model, Record<string,any>> =>
            new PropSchema<Model, Record<string,any>>(source, prop, (model: Model) => {
                return model[prop]
            }),
        serviceList: <T extends typeof Service>(_service: T, _resource: keyof T['resources']): PropSchema<Model, Record<string,any>[]> =>
            new PropSchema<Model, Record<string,any>[]>(source, prop, (model: Model) => {
                return model[prop]
            }, true),
    })
}

export interface OutputSchema<Model> {
    [name: string]: PropSchema<Model, any> | OutputSchema<Model>
}

export type PropType<T> = T extends PropSchema<any, infer X> ? X : {[k in keyof T]: PropType<T[k]>}