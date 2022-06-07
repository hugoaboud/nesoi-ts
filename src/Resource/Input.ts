import BaseModel from './Model'
import { $ as $Resource, $Service, InputPropType } from '.'
import { InputSchema, Schema } from './Schema'
import { StateMachine, TransitionInput } from './StateMachine'
import ResourceMachine from './ResourceMachine'
import { Client } from '../Auth/Client'

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

type InputType = 'boolean'|'int'|'float'|'string'|'date'|'datetime'|'object'|'enum'|'child'|'id'
type InputScope = 'public'|'protected'|'private'
type InputRequiredWhen = {
    param: string
    value: string | number | boolean
}
type InputRule = {
    scope: 'runtime' | 'database' | 'service'
    fn: (input: Record<string, any>, key: string, machine: StateMachine<any>, prop: InputProp<any>, client: Client) => Promise<boolean>,
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
    default_value?: T
    rules: InputRule[]
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
export class InputPropBuilder<T,L> {
    
    protected name!: string
    protected required?: boolean | InputRequiredWhen = true
    protected default_value?: T
    protected rules: InputRule[] = []
    protected scope: InputScope = 'public';

    constructor(
        protected alias: string,
        protected type: InputType,
        protected list?: boolean,
        protected members?: InputSchema,
        protected options?: readonly string[],
        protected child?: ResourceMachine<any,any>
    ) {
        if (type === 'id') {
            const scope = (child!.$ as any).Service ? 'service' : 'database';
            if (!list) this.link(scope);
            else this.links(scope);
        }
    }

    
    array() {
        let prop = new InputPropBuilder<T[], L extends never ? never : L[]>(this.alias, this.type, true, this.members, this.options, this.child);
        return prop;
    }

    /* Optional Fields */

    default(default_value?: T) {
        this.default_value = default_value;
        this.required = false;
        return this;        
    }
    optional() {
        let prop = new InputPropBuilder<T|undefined, L extends never ? never : L|undefined>(this.alias, this.type, this.list, this.members, this.options, this.child);
        prop.required = false;
        return prop;
    }
    requiredIf(param: string, value: string|boolean|number = true) {
        let prop = new InputPropBuilder<T|undefined, L extends never ? never : L|undefined>(this.alias, this.type, this.list, this.members, this.options, this.child);
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
            fn: (async (input: Record<string,any>, k:string) => input[k] > value) as any,
            msg: (prop: string) => `${prop} deve ser maior do que ${value}`
        })
        return this;
    }
    lessThan(value: number) {
        this.rules.push({
            scope: 'runtime',
            fn: (async (input: Record<string,any>, k:string) => input[k] < value) as any,
            msg: (prop: string) => `${prop} deve ser menor do que ${value}`
        })
        return this;
    }
    greaterThanOrEqualTo(value: number) {
        this.rules.push({
            scope: 'runtime',
            fn: (async (input: Record<string,any>, k:string) => input[k] >= value) as any,
            msg: (prop: string) => `${prop} deve ser maior ou igual a ${value}`
        })
        return this;
    }
    lessThanOrEqualTo(value: number) {
        this.rules.push({
            scope: 'runtime',
            fn: (async (input: Record<string,any>, k:string) => input[k] <= value) as any,
            msg: (prop: string) => `${prop} deve ser menor ou igual a ${value}`
        })
        return this;
    }
    between(start: number, end: number, include_start = true, include_end = true) {
        this.rules.push({
            scope: 'runtime',
            fn: (async (input: Record<string,any>, k:string) => 
                (input[k] > start || input[k] == start && include_start) && 
                (input[k] < end   || input[k] == end   && include_end)
            ) as any,
            msg: (prop: string) => `${prop} deve estar entre ${start} e ${end}`
        })
        return this;
    }

    /* Database Rules */
    
    noDuplicate(column: string) {
        this.rules.push({
            scope: 'database',
            fn: (async (input: Record<string,any>, k: string, machine: StateMachine<any>) => {
                const duplicate = await (machine.$.Model as typeof BaseModel).findBy(column, input[k]);
                return duplicate == null;
            }) as any,
            msg: (prop: string) => `${prop} já existe`
        })
        return this;
    }

    /* Link (id) Rules */

    private link(scope: 'database'|'service') {
        this.rules.push({
            scope,
            fn: (async (input: Record<string,any>, k: string, _: StateMachine<any>, prop:InputProp<any>, client: Client) => {
                const child = await prop.child!.readOne(client, input[k]);
                const name = '$' + k.replace(/_id$/,'');
                input[name] = child;
                return true;
            }) as any,
            msg: (prop: string) => `${prop} não encontrado`
        })
    }

    private links(scope: 'database'|'service') {
        this.rules.push({
            scope,
            fn: (async (input: Record<string,any>, k: string, _: StateMachine<any>, prop:InputProp<any>, client: Client) => {
                const children = await prop.child!.readMany(client, input[k]);
                let name = '$' + k.replace(/_ids$/,'');
                if (name.endsWith('y')) name.replace(/y$/,'ies');
                else name += 's';
                input[name] = children;
                return children.length === input[k].length;
            }) as any,
            msg: (prop: string) => `${prop} não encontrados`
        })
    }
}

/**
   [ Resource Input Prop Builder $ ]
   Entry point for the Input Prop Builder.
*/

export function $(alias: string) {
    return {
        boolean: new InputPropBuilder<boolean, never>(
            alias, 'boolean'
        ),
        int: new InputPropBuilder<number, never>(
            alias, 'int'
        ),
        float: new InputPropBuilder<number, never>(
            alias, 'float'
        ),
        string: new InputPropBuilder<string, never>(
            alias, 'string'
        ),
        date: new InputPropBuilder<string, never>(
            alias, 'date'
        ),
        datetime: new InputPropBuilder<string, never>(
            alias, 'datetime'
        ),
        id: <R extends ResourceMachine<any,any>>
            (resource: R) =>
                new InputPropBuilder<number, $Resource.Type<R['$']>>(
                    alias, 'id', false,
                    undefined, undefined, resource
                ),
        object: <T extends InputSchema>
            (members: T) =>
                new InputPropBuilder<{[k in keyof T]: InputPropType<T[k]>}, never>(
                    alias, 'object', false, members
                ),
        enum: <T extends readonly string[]>
            (options: T) =>
                new InputPropBuilder<T[number], never>(
                    alias, 'enum', false, undefined, options
                ),
        child: <R extends ResourceMachine<any,any>, T extends keyof R['$']['Transitions']>
            (resource: R, transition: T) =>
                new InputPropBuilder<Input<R['$'],T>, never>(
                    alias, 'child', false,
                    resource.$.Transitions[transition].input, undefined, resource
                )
    }
}