import { Prop, $ as $Prop, LambdaProp } from './Output';
import { $ as $InputProp, InputPropBuilder } from './Input';
import { GraphLink, $ as $GraphLink } from './Graph';
import { Schema as $Schema } from "./Schema";
import * as Service from "./Service";
import { Entity, Transition as $Transition } from "./StateMachine";
import ResourceMachine from "./ResourceMachine";

/** Type Helper: Extract Model from Schema */

export type Model<S extends $Schema> = InstanceType<S['Model']>

/**
    [ Resource Prop Type ]
    Extract the type from a Prop.
*/

type LambdaPropType<T extends LambdaProp<any>> = ReturnType<T> extends Promise<infer X> ? X : ReturnType<T>

export type PropType<T> =
    T extends Prop<any, infer X> ? X :
        T extends LambdaProp<any> ? LambdaPropType<T> : 
            T extends GraphLink<infer Y> ? Y : {
                [ k in keyof T]: PropType<T[k]>
        }

/**
    [ Resource Input Prop Type ]
    Extract the type from a Input Prop.
*/

export type InputPropType<T> =
    T extends InputPropBuilder<infer X, any> ? X : never

/**
    [ Resource Schema Interface ]
 */
export namespace $ {

    export const Prop = $Prop
    export const GraphLink = $GraphLink
    export const InputProp = $InputProp
    export const Transition = $Transition
    export const Schema = $Schema
    export const Machine = ResourceMachine;
    export type Type<S extends $Schema> = Entity<S>
}

export namespace $Service {
    export const Prop = $Prop
    export const GraphLink = $GraphLink
    export type BaseModel = Service.BaseModel
    export const Schema = Service.Schema
    export const Transition = Service.Transition
    export const Machine = Service.Machine;
    export type Type<S extends Service.Schema> = Service.Type<S>
}