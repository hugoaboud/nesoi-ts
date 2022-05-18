import { Resource, Schema } from '.'

export class GraphPropSchema<S extends Schema, R extends Resource<any,S>> {
    
    constructor(
        public resource: R,
        public fkey: keyof InstanceType<S['Model']>
    ) {}

}

export type GraphPropType<T> = T extends GraphPropSchema<any, infer X> ? X : never

export function GraphProp<S extends Schema, R extends Resource<any,S>>(resource: R) {
    return {
        child: (fkey: keyof InstanceType<S['Model']>) => new GraphPropSchema(resource, fkey)
    }
}