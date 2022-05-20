import BaseModel from './Model'
import { InputPropType } from '.'
import { InputSchema, Schema } from './Schema'
import { TransitionInput } from './StateMachine'
import ResourceMachine from './ResourceMachine'

/**
    [ Resource Input ]
    Input type for a given transition.    
 */

export type Input<
    S extends Schema,
    T extends keyof S['Transitions']
> = 
    TransitionInput<S['Transitions'][T]
>

/*
   Definition Types
*/

type InputType = 'boolean'|'int'|'float'|'string'|'date'|'datetime'|'object'|'enum'|'child'|'children'
type InputScope = 'public'|'protected'|'private'
type InputRequiredWhen = {
    param: string
    value: string | number | boolean
}
type InputRule<T> = {
    scope: 'runtime' | 'database' | 'service'
    fn: (model: typeof BaseModel, value: T) => Promise<boolean>,
    msg: (prop: string) => string
}

/**
   [ Resource Input Prop ]
   Type of an Input Prop built by the builder.
*/
export type InputProp<T> = {
    name: string
    required?: boolean | {
        param: string
        value: string | number | boolean
    }
    default?: T
    rules: InputRule<T>[]
    scope: InputScope
    alias: string
    type: InputType
    list?: boolean
    members?: InputSchema
    options?: string[]
    child?: ResourceMachine<any,any>
}

/**
   [ Resource Input Prop Builder ]
   Build an Input Prop by chaining rules.
*/
export class InputPropBuilder<T> {
    
    protected name!: string
    protected required?: boolean | InputRequiredWhen = true
    protected default?: T
    protected rules: InputRule<T>[] = []
    protected scope: InputScope = 'public';

    constructor(
        protected alias: string,
        protected type: InputType,
        protected list?: boolean,
        protected members?: InputSchema,
        protected options?: readonly string[],
        protected child?: ResourceMachine<any,any>
    ) {}

    /* Optional Fields */

    optional(default_value?: T) {
        let prop = new InputPropBuilder<T|undefined>(this.alias, this.type, this.list, this.members, this.options);
        prop.default = default_value;
        prop.required = false;
        return prop;
    }
    requiredIf(param: string, value: string|boolean|number = true) {
        let prop = new InputPropBuilder<T|undefined>(this.alias, this.type, this.list, this.members, this.options);
        prop.required = { param, value };
        return prop;
    }

    /* Input Scope */

    protected() {
        this.scope = 'protected';
        return this;
    }

    private() {
        this.scope = 'private';
        return this;
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

/**
   [ Resource Input Prop Builder $ ]
   Entry point for the Input Prop Builder.
*/

export function $(alias: string) {
    return {
        boolean: new InputPropBuilder<boolean>(
            alias, 'boolean'
        ),
        int: new InputPropBuilder<number>(
            alias, 'int'
        ),
        float: new InputPropBuilder<number>(
            alias, 'float'
        ),
        string: new InputPropBuilder<string>(
            alias, 'string'
        ),
        date: new InputPropBuilder<string>(
            alias, 'date'
        ),
        datetime: new InputPropBuilder<string>(
            alias, 'datetime'
        ),
        object: <T extends InputSchema>
            (members: T) =>
                new InputPropBuilder<{[k in keyof T]: InputPropType<T[k]>}>(
                    alias, 'object', false, members
                ),
        enum: <T extends readonly string[]>
            (options: T) =>
                new InputPropBuilder<T[number]>(
                    alias, 'enum', false, undefined, options
                ),
        child: <R extends ResourceMachine<any,any>, T extends keyof R['$']['Transitions']>
            (resource: R, transition: T) =>
                new InputPropBuilder<Input<R['$'],T>>(
                    alias, 'child', false,
                    resource.$.Transitions[transition].input, undefined, resource
                ),
        children: <R extends ResourceMachine<any,any>, T extends keyof R['$']['Transitions']>
            (resource: R, transition: T) =>
                new InputPropBuilder<Input<R['$'],T>[]>(
                    alias, 'children', true,
                    resource.$.Transitions[transition].input, undefined, resource
                )
    }
}