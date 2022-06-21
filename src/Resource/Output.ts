import { Client } from "../Auth/Client";

type PropType = 'boolean'|'int'|'decimal'|'string'|'money'|'lambda'

/**
   [ Resource Prop ]
   Type of an (Output) Prop.
*/

//@ts-ignore: The T parameter is used to infer the property type.
export class Prop<Model, T> {    
    constructor(
        public type: PropType,
        public prop: keyof Model,
        public fn: (obj: Model, prop: Prop<any,any>) => any,
        public list: boolean = false,
        public async = false,
    ) {}

    array() {
        const prop = new Prop<Model, T[]>(this.type, this.prop, this.fn, true);
        return prop;
    }
}

/**
   [ Resource Output Prop $ ]
   Entry point for the Output Prop.
*/

export function $<Model>() {
    return (prop: keyof Model) => ({
        boolean: new Prop<Model, boolean>('boolean', prop, (obj: Model) => {
            return obj[prop]
        }),
        int: new Prop<Model, number>('int', prop, (obj: Model, p: Prop<any,any>) => {
            if (p.list) return obj[prop];
            return parseInt(obj[prop] as any)
        }),
        decimal: new Prop<Model, number>('decimal', prop, (obj: Model) => {
            return obj[prop]
        }),
        string: new Prop<Model, string>('string', prop, (obj: Model) => {
            return obj[prop]
        }),
        money: new Prop<Model, string>('money', prop, (obj: Model) => {
            return (obj as any).coin + obj[prop]
        })
    })
}

/**
   [ Resource Lambda Prop ]
   Type of an (Output) Lambda Prop.
*/

export type LambdaProp<Model> = (model: Model, entity: Record<string,any>, client: Client) => any | Promise<any>