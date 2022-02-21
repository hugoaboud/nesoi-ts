export namespace $ {

    export type PropType = 'string' | 'int' | 'float';
    export type PropScope = 'public' | 'protected' | 'private';
    export type PropFKey = {
        table: string
        column: string
    };

    export type Prop = {
        alias: string
        name: string
        type: PropType
        opts: {
            scope: PropScope
            nullable: boolean
            default?: any
        }

        default: (val: any) => Prop
        nullable: () => Prop
        protected: () => Prop
        private: () => Prop
    }
    export namespace Prop {

        const Opts = () => ({
            scope: 'public' as PropScope,
            default: undefined,
            nullable: false
        })

        const Methods = {
            default: function (this: Prop, val: any) {
                this.opts.default = val;
                return this
            },
            nullable: function (this: Prop) {
                this.opts.nullable = true;
                return this;
            },
            protected: function (this: Prop) {
                this.opts.scope = 'protected';
                return this;
            },
            private: function (this: Prop) {
                this.opts.scope = 'private';
                return this;
            }

        } as Prop

        export function string(alias: string, name: string):Prop {
            return { ...Methods, alias, name, type: 'string', opts:Opts() }
        }

        export function int(alias: string, name: string):Prop {
            return { ...Methods, alias, name, type: 'int', opts:Opts() }
        }

        export function float(alias: string, name: string):Prop {
            return { ...Methods, alias, name, type: 'float', opts:Opts() }
        }

    }
        
    export interface Node {
    
        alias: string
        name: string
    
        props: Prop[]
    
    }

}
