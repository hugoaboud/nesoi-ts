import { GraphLink } from "./Graph";
import { InputPropBuilder } from "./Input";
import BaseModel from "./Model";
import { LambdaProp, Prop } from "./Output";
import { Hook, State, Transition } from "./StateMachine";

/**
    [ Resource State Schema ]
    Definition of a resource states. */

export type StateSchema = Record<string, State>

/**
    [ Resource Transition Schema ]
    Definition of a resource transitions.
 */

export type TransitionSchema<
    Model,
    States
> = {
    create: Transition<Model,'void',keyof States,any>,
    edit?: Transition<Model,keyof States,'.',any>,
    delete?: Transition<Model,keyof States,'deleted',any>
} &
    Record<string, Transition<Model,keyof States|'void'|'*',keyof States|'.',any>>

/**
    [ Resource Hook Schema ]
    Definition of a resource hooks.
 */

export type HookSchema<
    Model,
    States,
    Transitions extends TransitionSchema<Model,States>
> = 
    Hook<Model,States,Transitions>[]

/**
    [ Resource Output Schema ]
    Definition of how a resource should be built from a model.
 */

export interface OutputSchema<Model> {
    [ name: string]: Prop<Model, any> | LambdaProp<Model> | GraphLink<any> | OutputSchema<Model >
}

/**
    [ Resource Input Schema ]
    Definition of how a transition input should be validated.
 */

export interface InputSchema {
    [ name: string]: InputPropBuilder<any, any>
}

/**
    [ Resource Schema ]
    Schema which defines the resource behaviour.
*/

export function Schema<
    M extends typeof BaseModel,
    Model extends InstanceType<M>,
    Output extends OutputSchema<Model>,
    States extends StateSchema,
    Transitions extends TransitionSchema<Model,States>,
    Hooks extends HookSchema<Model, States, Transitions>
>(schema: {
    Model: M
    Alias: string
    Output: Output
    States: States
    Transitions: Transitions
    Hooks?: Hooks
}) {
    //return schema;
    return class Schema implements Schema {
        Model!: M
        Alias!: string
        Output!: Output
        States!: States
        Transitions!: Transitions
        Hooks?: Hooks
        static $ = schema;
    }
}

export type Schema = {
    Model: typeof BaseModel
    Alias: string
    Output: OutputSchema<any>
    States: StateSchema
    Transitions: TransitionSchema<any,StateSchema>
    Hooks?: HookSchema<any,any,any>
}