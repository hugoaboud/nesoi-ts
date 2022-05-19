import { Machine } from '.'

export class GraphLinkSchema<R extends Machine<any,any>> {
    
    constructor(
        public resource: R,
        public many = false
    ) {}

}

export type GraphLinkType<T> = T extends GraphLinkSchema<infer X> ? X : never

export const GraphLink = {

    child: <R extends Machine<any,any>>(resource: R) => 
        new GraphLinkSchema(resource),
    
    children: <R extends Machine<any,any>>(resource: R) => 
        new GraphLinkSchema(resource, true)

}