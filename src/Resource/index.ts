import { Schema as $Schema } from './Types/Schema'
import { Entity as $Entity, Input as $Input } from './Types/Entity'
import { $ as $Prop } from './Props/Output'
import { $ as $InputProp } from './Props/Input'
import { $ as $GraphLink } from './Props/Graph'
import { Transition as $Transition } from './Types/Transition'
import { ResourceMachine as $ResourceMachine, ServiceMachine as $ServiceMachine } from './Types/Machine'
import * as Service from './Types/Service'
import ResourceMachine from './Machines/ResourceMachine'
import ServiceMachine from './Machines/ServiceMachine'

export type Input<
    S extends $Schema | Service.Schema,
    T extends keyof S['Transitions']
> =    
    S extends $Schema ? $Input<S, T> : 
        S extends Service.Schema ? Service.Input<S,T> : never

export type Entity<
    R extends ResourceMachine<any,any>
> =
    R extends ServiceMachine<any,any> ? Service.Entity<R['$']> : $Entity<R['$']>

export namespace $ {
    
    export const Prop = $Prop
    export const GraphLink = $GraphLink
    export const InputProp = $InputProp
    
    export const Transition = $Transition
    
    export type Type<S extends ResourceMachine<any,any>> = $Entity<S['$']>
    export const Machine = $ResourceMachine;
}

export namespace $Service {

    export type BaseModel = Service.BaseModel

    export const Prop = $Prop
    export const InputProp = $InputProp
    export const GraphLink = $GraphLink
    
    export const Transition = Service.Transition
    export const LambdaTransition = Service.LambdaTransition
    
    export type Type<S extends ServiceMachine<any,any>> = Service.Entity<S['$']>
    export const Machine = $ServiceMachine;
}