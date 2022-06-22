import ResourceMachine from './ResourceMachine'
import { Entity } from './StateMachine'

/**
   [ Resource Graph Link ]
   A link to another resource, created at the Output Schema.
*/

//@ts-ignore
export class GraphLink<Type> {
    
    constructor(
        public resource: ResourceMachine<any,any>,
        public many = false
    ) {}

}

/**
   [ Resource Graph Link Builder $ ]
   Entry point for the Graph Link Builder.
*/

export function $<R extends ResourceMachine<any,any>>(resource: R) {
    
    return {
        child: new GraphLink<Entity<R['$']>>(resource),
        children: new GraphLink<Entity<R['$']>[]>(resource, true)
    }

}