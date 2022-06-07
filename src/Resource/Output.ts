type PropType = 'boolean'|'int'|'decimal'|'string'|'money'
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
        public fn: (obj: Model, prop: Prop<any,any>) => any,
        public list: boolean = false,
        public async = false,
    ) {}

    array() {
        const prop = new Prop<Model, T[]>(this.type, this.source, this.prop, this.fn, true);
        return prop;
    }
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
        int: new Prop<Model, number>('int', source, prop, (obj: Model, p: Prop<any,any>) => {
            if (p.list) return obj[prop];
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
        })

    })
}