import { Client } from "../../Auth/Client"
import { InputProp } from "../Props/Input"
import { InputPropType } from "./Entity"
import { InputSchema } from "./Schema"

/** A method which alters the resource state */
export interface Transition<
    Model,
    From,
    To,
    Input
> {
    alias: string
    from: From | From[] 
    to: To
    input: Input
    guards?: TransitionGuard<Model,Input>[]
    fn?: TransitionCallback<Model,Input,Promise<void>>
    after?: TransitionCallback<Model,Input,Promise<void>>
}

/** A method which alters the resource state */
export function Transition<
    Model,
    From,
    To,
    Input extends InputSchema
>(
    alias: string,
    transition: Omit<Transition<Model, From, To, Input>,'alias'>
) {
    return {
        alias,
        ...transition
    };
}

/** Defines a rule that should be true for the transition to be run */
export interface TransitionGuard<
    Model,
    Input
> {
    fn: TransitionCallback<Model,Input,Promise<boolean>>
    msg: TransitionCallback<Model,Input,string>
}

/** The input for a given transition, inferred from on it's InputSchema */
export type TransitionInput<
    E extends Transition<any,any,any,any>
> = {
    [k in keyof E['input']]: InputPropType<E['input'][k]>
}

/** A callback run by a transition */
export type TransitionCallback<
    Model,
    Input,
    Output
> = ( 
    obj: Model,
    args: {
        input: TransitionCallbackInput<Input>,
        client: Client,
        parent: Record<string,any>,
        build: (client: Client, obj: Model) => any
    }) => Output

/** The input received by the TransitionCallback, with validated and populated data */
export type TransitionCallbackInput<
    Input
> = {
    [k in keyof Input]: InputPropType<Input[k]>
} & {
    [k in LinkInputProps<Input> as LinkName<string & k>]: LinkInputPropType<Input[k]>
}

/** Filter link InputProps */
type LinkInputProps<T> = {
    [K in keyof T]: T[K] extends InputProp<any, infer Y> ? (Y extends never ? never : K ) : never
}[keyof T]

/** Extract the type from link InputProps */
type LinkInputPropType<T> = 
    T extends InputProp<any, infer Y> ? Y : never

/** Assemble link InputProp name */
type LinkName<S extends string> = S extends `${infer Head}_id` ? `$${Head}` : (
    S extends `${infer Head}y_ids` ? `$${Head}ies` : (
        S extends `${infer Head}_ids` ? `$${Head}s` : S
    )
);