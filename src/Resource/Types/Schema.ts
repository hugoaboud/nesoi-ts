import BaseModel from "../Model"
import { GraphLink } from "../Props/Graph"
import { InputProp } from "../Props/Input"
import { LambdaProp, Prop } from "../Props/Output"
import { Hook } from "./Hook"
import { Transition } from "./Transition"

/** A state which can be assumed by a resource */
export type State = string

/** Resource states schema */
export type StateSchema = Record<string, State>

/** Resource transitions schema */
export type TransitionSchema<
    Model,
    States
> = {
    create?: Transition<Model,'void',keyof States,any>,
    edit?: Transition<Model,keyof States,'.',any>,
    delete?: Transition<Model,keyof States,'deleted',any>
} &
    Record<string, Transition<Model,keyof States|'void'|'*',keyof States|'.',any>>

/** Resource hooks schema */
export type HookSchema<
    Model,
    States,
    Transitions extends TransitionSchema<Model,States>
> = 
    Hook<Model,States,Transitions>[]

/** Resource output schema */
export interface OutputSchema<Model> {
    [ name: string ]: Prop<Model, any> | LambdaProp<Model> | GraphLink<any> | OutputSchema<Model>
}

/** Resource input schema */
export interface InputSchema {
    [ name: string ]: InputProp<any, any>
}

export type Schema = {
    Model: typeof BaseModel
    Alias: string
    Output: OutputSchema<any>
    States: StateSchema
    Transitions: TransitionSchema<any,any>
    Hooks?: HookSchema<any,any,any>
}

/** Type Helper: Extract Model from Schema */
export type Model<S extends Schema> = InstanceType<S['Model']>