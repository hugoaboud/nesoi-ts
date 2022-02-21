export namespace $ {

    export type PropType = 'string' | 'int';
    export type PropFKey = {
        table: string
        column: string
    };

    export type Prop = {
        alias: string
        name: string
        type: PropType
        nullable: boolean
    }
    export namespace Prop {

        export function string(alias: string, name: string, nullable:'nullable'|undefined = undefined):Prop {
            return { alias, name, type: 'string', nullable: nullable?true:false }
        }

        export function int(alias: string, name: string, nullable:'nullable'|undefined = undefined):Prop {
            return { alias, name, type: 'int', nullable: nullable?true:false }
        }

    }
    
    
    export interface Node {
    
        alias: string
        name: string
    
        props: Prop[]
    
    }

}
