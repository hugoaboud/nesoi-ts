import { Client } from "../../Auth/Client"
import { TransitionSchema } from "./Schema"
import { TransitionInput } from "./Transition"

/** A method to be run when entering/exiting an state */
export interface Hook<
    Model,
    States,
    Transitions extends TransitionSchema<Model,States>
> {
    on: 'enter' | 'exit'
    state: keyof States
    fn: HookCallback<Model,Transitions,void>
}

/** A callback run by a hook */
export type HookCallback<
    Model,
    Transitions extends TransitionSchema<Model, any>,
    Output
> = ( 
    obj: Model,
    args: {
        from: string,
        client: Client,
        input: Record<string,any>,
        run: <K extends keyof Transitions>(transition: K, input: TransitionInput<Transitions[K]>) => Promise<void>
    }
) => Promise<Output>