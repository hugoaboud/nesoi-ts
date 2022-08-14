import { Schema, TransitionSchema } from "./Schema"
import { DateTime } from 'luxon' 
import { LambdaProp, Prop } from "../Props/Output"
import { GraphLink } from "../Props/Graph"
import { InputProp } from "../Props/Input"
import { Transition, TransitionInput } from "./Transition"
import { Client } from "../../Auth/Client"

/** A resource built by a ResourceMachine */
export type Entity<S extends Schema> = 
{ 
    id: number
    state: keyof S['States']
    created_at: DateTime
    updated_at: DateTime
} & 
{ [k in keyof S['Output']]: PropType<S['Output'][k]> } &
Methods<S['Transitions']>

/** Extract the type from a LambdaProp */
type LambdaPropType<T extends LambdaProp<any>> = ReturnType<T> extends Promise<infer X> ? X : ReturnType<T>

/** Extract the type from a Prop */
export type PropType<T> =
    T extends Prop<any, infer X> ? X :
        T extends LambdaProp<any> ? LambdaPropType<T> : 
            T extends GraphLink<infer Y> ? Y : {
                [ k in keyof T]: PropType<T[k]>
        }

/** Extract the type from a InputProp */
export type InputPropType<T> =
    T extends InputProp<infer X, any> ? X : never

/** A method which belongs to the resource instance and runs a transition */
export type Method<
    T extends Transition<any,any,any,any>
> = (
    client: Client,
    input: TransitionInput<T>
) => Promise<void>

/** A record of all method which aren't 'create' */
export type Methods<
    Transitions extends TransitionSchema<any,any>
> = {
    [x in keyof Omit<Transitions,'create'>] : Method<Transitions[x]>
}

/** Entity input for a transition */
export type Input<
    S extends Schema,
    T extends keyof S['Transitions']
> = 
    TransitionInput<S['Transitions'][T]>