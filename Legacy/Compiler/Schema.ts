import { Status } from "../Common/Status";
import { Rules } from "./Rules";
export namespace $ {

    /* Props */
    export function Prop(alias: string): Prop.T {
        return new Prop.T(alias);
    }
    
    export namespace Prop {
        type Type = 'string' | 'int' | 'float';
        type Scope = 'public' | 'protected' | 'private';
        type Opts = {
            scope: Scope
            nullable: boolean
            default?: any
        }
        // type FKey = {
        //     table: string
        //     column: string
        // };
        export interface I {
            name: string
            alias: string
            type: Type
            opts: Opts
            build: (name: string) => void
        }
        export class T {
        
            protected name!: string
            protected type!: Type
            protected opts: Opts
    
            constructor(
                protected alias: string
            ) {
                this.opts = {
                    scope: 'public',
                    nullable: false
                }
            }

            protected build(name: string) {
                this.name = name;
            }
    
            default(val: any) {
                this.opts.default = val;
                return this
            }
            nullable() {
                this.opts.nullable = true;
                return this;
            }
            protected() {
                this.opts.scope = 'protected';
                return this;
            }
            private() {
                this.opts.scope = 'private';
                return this;
            }
    
            string(): Prop.T { 
                this.type = 'string';
                return this;
            }
            int(): Prop.T { 
                this.type = 'int';
                return this;
            }
            float(): Prop.T { 
                this.type = 'float';
                return this;
            }
        }
    }
    
    /* Rules */

    
    export function Rule(prop: string): Rule.T {
        return new Rule.T(prop);
    }
    export namespace Rule {

        type Scope = {
            create: boolean
            update: boolean
        }
        type ExceptionArg = {
            name: string
            type: string
        }
        export type Exception = {
            name: string
            args: ExceptionArg[]
            status: Status
            msg: string
        }
        export interface I {
            scope: Scope
            code: string
            exception?: Exception
            build: (schema: $.Node) => void
        }
        export class T {
            protected scope: Scope
            protected code!: string
            protected exception?: Exception
            protected fn!: (prop: $.Prop.I) => {code: string, exception?: Exception}

            constructor(
                protected prop: string
            ) {
                this.scope = {
                    create: false,
                    update: false
                }
            }

            protected build(schema: $.Node) {
                let {code, exception} = this.fn(schema.props[this.prop] as any as Prop.I);
                this.code = code;
                this.exception = exception;
            }

            createOnly() {
                (this as any).scope.create = true;
                (this as any).scope.update = false;
            }
            updateOnly() {
                (this as any).scope.create = false;
                (this as any).scope.update = true;
            }
            
            greaterThan(this: Rule.T, val: number): Rule.T {
                this.fn = Rules.GreaterThan(val)
                return this;
            }
            greaterThanOrEqualTo(this: Rule.T, val: number): Rule.T {
                this.fn = Rules.GreaterThanOrEqualTo(val)
                return this;
            }
            lessThan(this: Rule.T, val: number): Rule.T {
                this.fn = Rules.LessThan(val)
                return this;
            }
            lessThanOrEqualTo(this: Rule.T, val: number): Rule.T {
                this.fn = Rules.LessThanOrEqualTo(val)
                return this;
            }
        }

    }

    /* Node */

    export type Node = {
    
        alias: string
        name: string
    
        props: Record<string,Prop.T>
        rules: Rule.T[]
    
    }

}
