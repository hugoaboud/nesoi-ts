import $ResourceMachine from "../Machines/ResourceMachine";
import $ServiceMachine from "../Machines/ServiceMachine";
import BaseModel from "../Model";
import { HookSchema, OutputSchema, StateSchema, TransitionSchema } from "./Schema";
import * as Service from "./Service";
import ServiceClass from "../../Service";

/** Resource machine schema */
export function ResourceMachine<
    M extends typeof BaseModel,
    Model extends InstanceType<M>,
    Output extends OutputSchema<Model>,
    States extends StateSchema,
    Transitions extends TransitionSchema<Model,States>,
    Hooks extends HookSchema<Model, States, Transitions>
>($: {
    Model: M
    Alias: string
    Output: Output
    States: States
    Transitions: Transitions
    Hooks?: Hooks
}) {
    return class extends $ResourceMachine<any, typeof $> {
        static $ = $;
        static machine() {
            return () => new this($);
        }
    } as typeof $ResourceMachine<any,typeof $> & {
        $: typeof $,
        machine: <M>(this: {new (schmea: typeof $): M}) => <T>() => $ResourceMachine<T, typeof $> & M
    }
}

export function ServiceMachine<Model extends Service.BaseModel>() {
    return <
        T,
        Output extends OutputSchema<Model>,
        Transitions extends Service.TransitionSchema,
    >($: {
        Service: typeof ServiceClass
        Version: string
        Name: string
        Alias: string
        Route: string
        Query?: Record<string,string>,
        Parse: (obj: Model) => T
        Output?: Output
        Transitions: Transitions
    }) => {
        return class extends $ServiceMachine<any, typeof $> {
            static $ = $;
            static machine() {
                return () => new this($);
            }
        } as typeof $ServiceMachine<any,typeof $> & {
            $: typeof $,
            machine: <M>(this: {new (schema: typeof $): M}) => <T>() => $ServiceMachine<T, typeof $> & M
        }
    }
}