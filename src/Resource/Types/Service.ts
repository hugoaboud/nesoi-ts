import { Client } from "../../Auth/Client"
import Service, { Verb } from "../../Service"
import { InputPropType, PropType } from "./Entity"
import { InputSchema, OutputSchema } from "./Schema"
import { TransitionCallback, TransitionGuard } from "./Transition"

/** Base model for a Service Resource */
export interface BaseModel {
    id: number
    created_at: string
    updated_at: string
}   
    
/** Transition of a Service Resource */
//@ts-ignore
export interface Transition<T> {
    verb: Verb
    url: string
}
export function Transition<T>(transition: Transition<T>) { return transition; }

/** Lambda Transition of a Service Resource */
export interface LambdaTransition<Input> {
    input: Input,
    guards?: TransitionGuard<BaseModel,Input>[]
    fn: TransitionCallback<{
        id?: number,
        [x: string]: any
    }, Input, Promise<void>>
}
export function LambdaTransition<Input extends InputSchema>(transition: LambdaTransition<Input>): LambdaTransition<Input> {
    return transition;
}

export type TransitionSchema = Record<string, Transition<any> | LambdaTransition<any>>

export type Schema = {
    Service: typeof Service
    Version: string
    Route: string
    Name: string
    Alias: string
    Query?: Record<string,string>
    Parse: (obj: any) => any
    Output?: OutputSchema<any>
    Transitions: TransitionSchema
}

type TransitionInput<T> = T extends Transition<infer X> ? X : 
                            T extends LambdaTransition<infer X> ? {
                                [k in keyof X]: InputPropType<X[k]>
                            } : never

/** A method which belongs to the resource instance and runs a transition */
export type Method<
    T extends Transition<any> | LambdaTransition<any>
> = (
    client: Client,
    input: TransitionInput<T>
) => Promise<void>

/** A record of all method which aren't 'create' */
export type Methods<
    Transitions extends TransitionSchema
> = {
    [x in keyof Omit<Transitions,'create'>] : Method<Transitions[x]>
}

/** A resource built by a ServiceMachine */
export type Entity<S extends Schema> = 
    ReturnType<S['Parse']> &
    { [k in keyof NonNullable<S['Output']>]: PropType<NonNullable<S['Output']>[k]> } &
    Methods<S['Transitions']>

/** Entity input for a transition */
export type Input<
    S extends Schema,
    T extends keyof S['Transitions']
> = 
    TransitionInput<S['Transitions'][T]>