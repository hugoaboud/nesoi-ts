import { $ as $InputProp } from '../Resource/Props/Input'
import { $ as $Job, Job, JobCallbackInput } from '../Worker/Job2'

export namespace $ {
    
    export const InputProp = $InputProp
    export const Job = $Job;

    export type Input<J extends Job<any>> = JobCallbackInput<J>
    export type Data<J extends Job<any>> = Awaited<ReturnType<J['prepare']>>
}
