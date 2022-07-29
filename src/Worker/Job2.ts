import { Client } from "../Auth/Client";
import { InputPropType } from "../Resource/Types/Entity";
import { InputSchema } from "../Resource/Types/Schema";
import { TransitionCallbackInput } from "../Resource/Types/Transition";
import Validator from "./Helpers/Validator";
import { Exception as BaseException } from '@adonisjs/core/build/standalone';
import { Status } from "../Service";
import { CamelToSnakeCase, randomID } from "../Util/String";

type JobCallback<
    Input,
    Output
> = ( 
    this: Job<any>,
    input: Input,
    args: {
        client: Client,
    }) => Output

interface JobGuard<Input>  {
    fn: JobCallback<TransitionCallbackInput<Input>, Promise<boolean>>,
    msg: JobCallback<TransitionCallbackInput<Input>, string>
}

export interface JobSchema {
    Alias: string,
    Input: InputSchema,
    Guards?: JobGuard<any>[]
}

export type JobCallbackInput<J extends Job<any>> = TransitionCallbackInput<J['$']['Input']>

type JobInput<J extends Job<any>> = {
    [k in keyof J['$']['Input']]: InputPropType<J['$']['Input'][k]>
}

export function $<
    Input extends InputSchema
>($: {
    Alias: string,
    Input: Input,
    Guards?: JobGuard<Input>[]
}) {
    return class extends Job<typeof $> {
        getSchema() { return $ }
    } as typeof Job<typeof $>
}

export class Job<S extends JobSchema> {

    $!: S
    protected validator: Validator<S>

    getSchema() { return {} as S }

    constructor(
        protected client: Client,
        protected id?: string
    ) {
        this.$ = this.getSchema();
        this.validator = new Validator(this);
        if (!id) this.id = randomID();
    }

    name(format: 'UpperCamel' | 'lower_snake' | 'UPPER_SNAKE') {
        const name = this.constructor.name;
        if (format === 'UpperCamel') return name;
        const snake = CamelToSnakeCase(name);
        if (format === 'lower_snake') return snake;
        return snake.toUpperCase();
    }

    /* Job Commands */
        
    static async run<
        S extends JobSchema,
        J extends Job<S>
    >(
        this: { new(client: Client, id?: string) : J },
        client: Client,
        input: JobInput<J>
    ) {
        const job = new this(client);
        const data = await job.runPrepare(input);
        return job.runExecute(data);
    }

    /* Execution helpers */

    private async guard(input: Record<string,any>) {
        const guards = this.$.Guards;
        if (!guards) return;
        for (let g in guards) {
            const valid = await guards[g].fn.bind(this)(input, { client: this.client });
            if (!valid) throw guards[g].msg.bind(this)(input, { client: this.client });
        }
    }

    private async runPrepare(input: Record<string,any>) {
        await this.validator.validate(this.client, input);
        await this.guard(input).catch(e => {
            throw Exception.GuardFailed(this, e)
        });
        const data = await this.prepare(input as any);
        return data;
    }

    private async runExecute(data: Record<string,any>): Promise<any> {
        return this.execute(data as any);
    }

    /* "Abstract" methods */

    async prepare(
        // input: TransitionCallbackInput<S['Input']>
        input: any
    ): Promise<any> {
        return input;
    }
    
    async execute<
        S extends JobSchema,
        J extends Job<S>
    >(
        this: J,
        _input: Awaited<ReturnType<J['prepare']>>
    ): Promise<any> {}

}

export class Exception extends BaseException {

    constructor(job: Job<any>, message: string, status: Status) {
        super(message, status, 'E_'+job.name('UPPER_SNAKE'))
    }

    static GuardFailed(job: Job<any>, msg: string) {
        return new this(job, msg, Status.BADREQUEST);
    }

}