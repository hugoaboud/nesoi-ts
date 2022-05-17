import { schema, rules, TypedSchema } from '@ioc:Adonis/Core/Validator'
import Service from "../Service"
import BaseModel from './Model'

/*
   [ Input Props ]
   Input Props are validation definitions for incoming values.
   Each transition defines it's own Input Prop Schema.
*/

type InputType = 'boolean'|'int'|'float'|'string'|'date'|'datetime'|'object'|'enum'
type InputRequiredWhen = {
    param: string
    value: string | number | boolean
}
type InputRule<T> = {
    scope: 'runtime' | 'database' | 'service'
    fn: (model: typeof BaseModel, value: T) => Promise<boolean>,
    msg: (prop: string) => string
}

/** Definitions for an InputProp, which belong into the validation schema. */
export class InputPropSchema<T> {
    
    protected required?: boolean | InputRequiredWhen = true
    protected default?: T
    protected rules: InputRule<T>[] = []
    protected name!: string

    constructor(
        protected alias: string,
        protected type: InputType,
        protected list?: boolean,
        protected members?: InputSchema,
        protected options?: readonly string[],
        protected service?: {
            type: typeof Service,
            resource: string
        }
    ) {}

    optional(default_value?: T) {
        let prop = new InputPropSchema<T|undefined>(this.alias, this.type, this.list, this.members, this.options, this.service);
        prop.default = default_value;
        prop.required = false;
        return prop;
    }
    requiredIf(param: string, value: string|boolean|number = true) {
        let prop = new InputPropSchema<T|undefined>(this.alias, this.type, this.list, this.members, this.options, this.service);
        prop.required = { param, value };
        return prop;
    }

    /* Runtime Rules */

    greaterThan(value: number) {
        this.rules.push({
            scope: 'runtime',
            fn: (async (_: typeof BaseModel, v:number) => v > value) as any,
            msg: (prop: string) => `${prop} deve ser maior do que ${value}`
        })
        return this;
    }
    lessThan(value: number) {
        this.rules.push({
            scope: 'runtime',
            fn: (async (_: typeof BaseModel, v:number) => v < value) as any,
            msg: (prop: string) => `${prop} deve ser menor do que ${value}`
        })
        return this;
    }
    greaterThanOrEqualTo(value: number) {
        this.rules.push({
            scope: 'runtime',
            fn: (async (_: typeof BaseModel, v:number) => v >= value) as any,
            msg: (prop: string) => `${prop} deve ser maior ou igual a ${value}`
        })
        return this;
    }
    lessThanOrEqualTo(value: number) {
        this.rules.push({
            scope: 'runtime',
            fn: (async (_: typeof BaseModel, v:number) => v <= value) as any,
            msg: (prop: string) => `${prop} deve ser menor ou igual a ${value}`
        })
        return this;
    }
    between(start: number, end: number, include_start = true, include_end = true) {
        this.rules.push({
            scope: 'runtime',
            fn: (async (_: typeof BaseModel, v:number) => 
                (v > start || v == start && include_start) && 
                (v < end   || v == end   && include_end)
            ) as any,
            msg: (prop: string) => `${prop} deve estar entre ${start} e ${end}`
        })
        return this;
    }

    /* Database Rules */
    
    noDuplicate(column: string) {
        this.rules.push({
            scope: 'database',
            fn: (async (model: typeof BaseModel, v: string) => {
                const duplicate = await model.findBy(column, v);
                return duplicate == null;
            }) as any,
            msg: (prop: string) => `${prop} já existe`
        })
        return this;
    }
}

export type InputPropType<T> = T extends InputPropSchema<infer X> ? X : never

/** Definition builder for an Input Prop. Used to declare validation schemas. */
export function InputProp(alias: string) {
    return {
        boolean: new InputPropSchema<boolean>(alias, 'boolean'),
        int: new InputPropSchema<number>(alias, 'int'),
        float: new InputPropSchema<number>(alias, 'float'),
        string: new InputPropSchema<string>(alias, 'string'),
        date: new InputPropSchema<string>(alias, 'date'),
        datetime: new InputPropSchema<string>(alias, 'datetime'),
        object: <T extends InputSchema>(schema: T) => new InputPropSchema<{[k in keyof T]: InputPropType<T[k]>}>(alias, 'object', false, schema),
        enum: <T extends readonly string[]>(options: T) => new InputPropSchema<T[number]>(alias, 'enum', false, undefined, options),
        serviceKey: <T extends typeof Service>(service: T, resource: keyof T['resources']) => new InputPropSchema<number>(alias, 'int', false, undefined, undefined, {
            type: service, resource: resource as string
        }),
        serviceKeys: <T extends typeof Service>(service: T, resource: keyof T['resources']) => new InputPropSchema<number>(alias, 'int', true, undefined, undefined, {
            type: service, resource: resource as string
        })
    }
}

/** Input (validation) schema. */
export interface InputSchema {
    [name: string]: InputPropSchema<any>
}

/** Metadata of InputProp. */
export type InputProp<T> = {
    name: string
    required?: boolean | {
        param: string
        value: string | number | boolean
    }
    default?: T
    rules: InputRule<T>[]
    alias: string
    type: InputType
    list?: boolean
    members?: InputSchema
    options?: string[]
    service?: {
        type: typeof Service
        resource: string
    }
}

/** */

function inputPropToValidator(prop: InputProp<any>): Record<string,any> {
    const type = {
        int: 'number',
        float: 'number',
        money: 'number',
        string: 'string',
        boolean: 'boolean',
        enum: 'enum',
        date: 'date',
        datetime: 'date',
        object: 'object'
    }[prop.type];
    let validator = (schema as any)[type];
    if (prop.required !== true)
        validator = validator.optional;
    
    if (typeof prop.required === 'object') {
        let rule = [ rules.requiredWhen(prop.required.param, 'in', [prop.required.value]) ]
        if (type === 'enum') return validator(prop.options, rule);
        if (type === 'date') return validator(undefined, rule);
        return validator(rule);
    }
    
    if (prop.type === 'enum') return validator(prop.options);
    return validator();
}

export function inputSchemaToValidator(input: InputSchema): TypedSchema {
    input = JSON.parse(JSON.stringify(input));
    Object.keys(input).forEach(k => {
        let prop = input[k] as any as InputProp<any>;
        let validator = inputPropToValidator(input[k] as any) as any;
        if (prop.members) {
            validator = validator.members(inputSchemaToValidator(prop.members));
        }
        input[k] = validator;
    })
    return input as any;
}
