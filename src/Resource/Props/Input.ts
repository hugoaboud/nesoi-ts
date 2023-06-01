import BaseModel from '../Model'
import ResourceMachine from '../Machines/ResourceMachine'
import { Client } from '../../Auth/Client'
import { isEmpty } from '../../Validator/ResourceSchemaValidator'
import { InputSchema } from '../Types/Schema'
import { StateMachine } from '../Machines/StateMachine'
import { InputPropType } from '../Types/Entity'
import { Entity, Input } from '..'
import { MultipartFileContract } from '@ioc:Adonis/Core/BodyParser'

/*
   Definition Types
*/

type InputType = 'boolean'|'int'|'float'|'string'|'date'|'datetime'|'object'|'enum'|'transition'|'id'|'file'
type InputScope = 'public'|'protected'|'private'
type InputRequiredWhen = {
    param: string
    value: string | number | boolean
}
type InputRule = {
    scope: 'runtime' | 'database' | 'service'
    fn: (input: Record<string, any>, key: string, machine: StateMachine<any,any>, prop: InputPropT, client: Client) => Promise<boolean>,
    msg: (prop: string) => string
}

/**
   [ Resource Input Prop Builder ]
   Build an Input Prop by chaining rules.
*/
export class InputProp<T,L> {
    
    protected name!: string
    protected required?: boolean | InputRequiredWhen = true
    protected default_value?: T
    protected rules: InputRule[] = []
    protected scope: InputScope = 'public';
    protected log = true;

    constructor(
        protected alias: string,
        protected type: InputType,
        protected list?: boolean,
        protected members?: InputSchema,
        protected options?: readonly string[],
        protected child?: ResourceMachine<any,any>,
        protected fileSettings?: {
            size: string,
            extnames: string[]
        },
    ) {
        if (type === 'id') {
            const scope = (child!.$ as any).Service ? 'service' : 'database';
            if (!list) this.link(scope);
            else this.links(scope);
        }
    }

    
    array() {
        let prop = new InputProp<T[], L extends never ? never : L[]>(this.alias, this.type, true, this.members, this.options, this.child, this.fileSettings);
        return prop;
    }

    dontLog() {
        this.log = false;
        return this;
    }

    /* Optional Fields */

    default(default_value?: T) {
        this.default_value = default_value;
        this.required = false;
        return this;        
    }
    optional() {
        let prop = new InputProp<T|undefined, L extends never ? never : L|undefined>(this.alias, this.type, this.list, this.members, this.options, this.child);
        prop.required = false;
        return prop;
    }
    requiredIf(param: string, value: string|boolean|number = true) {
        let prop = new InputProp<T|undefined, L extends never ? never : L|undefined>(this.alias, this.type, this.list, this.members, this.options, this.child);
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
    
    noDuplicate(column: string | string[], global = false) {
        const cols = Array.isArray(column) ? column : [column];
        this.rules.push({
            scope: 'database',
            fn: (async (input: Record<string,any>, k: string, machine: StateMachine<any,any>, _:InputProp<any,any>, client: Client) => {
                const model = machine.$.Model as typeof BaseModel;
                let entries = await model.readOneGroup(client, cols[0], input[k], !global);
                cols.forEach(col => {
                    entries = entries.filter((e:any) => e[col] === input[col])
                })
                return entries.length == 0;
            }) as any,
            msg: (prop: string) => `${prop} já existe`
        })
        return this;
    }

    /* Link (id) Rules */

    private link(scope: 'database'|'service') {
        this.rules.push({
            scope,
            fn: (async (input: Record<string,any>, k: string, _: StateMachine<any,any>, prop:InputProp<any,any>, client: Client) => {
                if (isEmpty(input[k])) return true;
                const name = '$' + k.replace(/_id$/,'');
                if (input.__scope__ === 'protected' || input.__scope__ === 'private') {
                    if (name in input) return true;
                }
                const child = await prop.child!.readOne(client, input[k]);
                input[name] = child;
                return true;
            }) as any,
            msg: (prop: string) => `${prop} não encontrado`
        })
    }

    private links(scope: 'database'|'service') {
        this.rules.push({
            scope,
            fn: (async (input: Record<string,any>, k: string, _: StateMachine<any,any>, prop:InputProp<any,any>, client: Client) => {
                if (isEmpty(input[k])) return true;
                let name = '$' + k.replace(/_ids$/,'');
                if (name.endsWith('y')) name.replace(/y$/,'ies');
                else name += 's';
                if (input.__scope__ === 'protected' || input.__scope__ === 'private') {
                    if (name in input) return true;
                }
                const children = await prop.child!.readMany(client, input[k]);
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
        boolean: new InputProp<boolean, never>(
            alias, 'boolean'
        ),
        int: new InputProp<number, never>(
            alias, 'int'
        ),
        float: new InputProp<number, never>(
            alias, 'float'
        ),
        string: new InputProp<string, never>(
            alias, 'string'
        ),
        date: new InputProp<string, never>(
            alias, 'date'
        ),
        datetime: new InputProp<string, never>(
            alias, 'datetime'
        ),
        id: <R extends ResourceMachine<any,any>>
            (resource: R) =>
                new InputProp<number, Entity<R>>(
                    alias, 'id', false,
                    undefined, undefined, resource
                ),
        enum: <T extends readonly string[]>
            (options: T) =>
                new InputProp<T[number], never>(
                    alias, 'enum', false, undefined, options
                ),
        object: <T extends InputSchema>
            (members: T) =>
                new InputProp<{[k in keyof T]: InputPropType<T[k]>}, never>(
                    alias, 'object', false, members
                ),
        resource: <R extends ResourceMachine<any,any>>
            (_: R) =>
                new InputProp<Entity<R>, Entity<R>>(
                    alias, 'object', false, {}
                ),
        transition: <R extends ResourceMachine<any,any>, T extends keyof R['$']['Transitions']>
            (resource: R, transition: T) =>
                new InputProp<Input<R['$'],T>, never>(
                    alias, 'transition', false,
                    resource.$.Transitions[transition].input, undefined, resource
                ),
        file: (max_size: string, extnames: string[]) =>
            new InputProp<MultipartFileContract, never>(
                alias, 'file', false,
                undefined, undefined, undefined, {
                    size: max_size,
                    extnames
                }
            )
    }
}

/**
   [ Resource Input Prop ]
   Type of an Input Prop built by the builder.
*/
export type InputPropT = {
    name: string
    required?: boolean | {
        param: string
        value: string | number | boolean
    }
    default_value?: any
    rules: InputRule[]
    scope: InputScope
    alias: string
    type: InputType
    list?: boolean
    members?: InputSchema
    options?: string[]
    child?: ResourceMachine<any,any>
    fileSettings?: {
        size: string,
        extnames: string[]
    }
    log: boolean
}