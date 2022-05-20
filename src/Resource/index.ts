import { Prop, $ as $Prop } from './Output';
import { $ as $InputProp, InputPropBuilder } from './Input';
import { GraphLink, $ as $GraphLink } from './Graph';
import { DateTime } from 'luxon'
import { Schema as $Schema } from "./Schema";
import { Method, Transition as $Transition } from "./StateMachine";
import ResourceMachine from "./ResourceMachine";

/** Type Helper: Extract Model from Schema */

export type Model<S extends $Schema> = InstanceType<S['Model']>

/**
    [ Resource Prop Type ]
    Extract the type from a Prop.
*/

export type PropType<T> =
    T extends Prop<any, infer X> ? X : {
        [ k in keyof T]: PropType<T[k] >
    }

/**
    [ Resource Graph Link Type ]
    Extract the type from a Graph Link.
*/

export type GraphLinkType<T> =
    T extends GraphLink<infer X> ? X : never

/**
    [ Resource Input Prop Type ]
    Extract the type from a Input Prop.
*/

export type InputPropType<T> =
    T extends InputPropBuilder<infer X> ? X : never

/**
    [ Resource Type ]
    Merges the given type properties with transition methods.
*/

export type Type<S extends $Schema> = 
    { 
        id: number
        created_at: DateTime
        updated_at: DateTime
    } & 
    { [k in keyof S['Output']]: PropType<S['Output'][k]> } &
    Omit<{ [k in keyof S['Transitions']]: Method<S['Transitions'][k]> }, 'create'>

/**
    [ Resource Schema Interface ]
 */
export namespace $ {

    export const Prop = $Prop
    export const GraphLink = $GraphLink
    export const InputProp = $InputProp
    export const Transition = $Transition
    export const Schema = $Schema
    export const Machine = {
        Resource: ResourceMachine
    }

}