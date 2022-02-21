import Node from "../Node";

export interface Prop {
    source: 'model' | 'entity'
    fn: (data: Record<string,any>, key: string, node: Node<any,any>) => any
    async?: boolean
}

export namespace Prop {
    
    export function Field(field: string): Prop {
        return {
            source: 'model',
            fn: (model: Record<string,any>) => model[field]
        }
    }
    
    export function FromModel(fn: (model: Record<string,any>) => any): Prop {
        return {
            source: 'model',
            fn
        }
    }
    
    export function FromEntity(fn: (model: Record<string,any>) => any): Prop {
        return {
            source: 'entity',
            fn
        }
    }
    
}