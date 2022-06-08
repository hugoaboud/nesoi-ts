import ResourceMachine from './ResourceMachine'

/**
   [ Resource Graph Link ]
   A link to another resource, created at the Output Schema.
*/

export class GraphLink<R extends ResourceMachine<any,any>> {
    
    constructor(
        public resource: R,
        public many = false
    ) {}

}

/**
   [ Resource Graph Link Builder $ ]
   Entry point for the Graph Link Builder.
*/

export function $<R extends ResourceMachine<any,any>>(resource: R) {
    
    return {
        child: new GraphLink(resource),
        children: new GraphLink(resource, true)
    }

}