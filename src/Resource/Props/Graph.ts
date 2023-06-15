
/**
   [ Resource Graph Link ]
   A link to another resource, created at the Output Schema.
*/

import { Entity } from "..";
import ResourceMachine from "../Machines/ResourceMachine";
import { Tenancy } from "../Model";

type Single<T> = T extends any[] ? T[number] : T

//@ts-ignore
export class GraphLink<Type> {
    
    constructor(
        public resource: ResourceMachine<any,any>,
        public fkey?: string,
        public many = false,
        public tenancy: Tenancy = 'default',
        public parser?: (entities: any) => any,
        public one_parser?: (entity: any) => any,
        public sorter?: (a: Single<Type>, b: Single<Type>) => number
    ) {
        if (!this.many && !this.fkey)
            this.fkey = resource.name('lower_snake') + '_id'
    }

    public parseOne<T>(fn: (entity: Single<Type>) => T) {
        return new GraphLink<T>(this.resource, this.fkey, this.many, this.tenancy, this.parser, fn)
    }

    public parse<T>(fn: (entities: Type) => T) {
        return new GraphLink<T>(this.resource, this.fkey, this.many, this.tenancy, fn, this.one_parser);
    }

    public sort(fn: (el: any) => number) {
        this.sorter = fn;
        return this;
    }

    public noTenancy() {
        this.tenancy = 'no_tenancy';
        return this;
    }

}

/**
   [ Resource Graph Link Builder $ ]
   Entry point for the Graph Link Builder.
*/

export function $<R extends ResourceMachine<any,any>>(resource: R) {
    
    return {
        child: (fkey?: string) => new GraphLink<Entity<R>>(resource, fkey),
        children: (fkey?: string) => new GraphLink<Entity<R>[]>(resource, fkey, true)
    }

}