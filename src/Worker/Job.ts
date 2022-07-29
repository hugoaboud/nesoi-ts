// v0.7
// @ts-nocheck

/*
	iCertus Framework
	[ Test/Worker/Job ]

	A job to be executed either by the application or a worker process.
    In order to be executed by a Worker Process, the Job is handled by a queue.
*/

import { Validator } from '../Util/Validator';
import { TypedSchema } from '@ioc:Adonis/Core/Validator'
import Client from '../App';
import { TransactionClientContract } from '@ioc:Adonis/Lucid/Database';
import { JobLog, JobLogger } from './JobLog';
import WorkerJob, { JobStatus } from '../Database/Models/WorkerJob';
import Console from '../Util/Console';

export type JobInput = Record<string,any>
export interface JobOutput<T extends Record<string,any>> {
    output: T
    log: JobLog
}

export abstract class Job<Data, Output> {
    
    /** The context of the Job. */
    static context: string;

    /** The human name of the Job. */
    static alias: string;

    /** Adonis validator schema for input. */
    static schema: TypedSchema

    /** Field names for assemblying Adonis validator error messages. */
    static names: Record<string,string>

    /** Max attempts before considering the job failed. */
    static max_attemps: number = 1

    /** Data created on the rules step */
    protected data!: Data

    /** Apply rules to input. Called after validation, before seralization/execution. */
    abstract rules(input: JobInput): Promise<Data>

    /** Execute the job with the validated input. */
    abstract execute(input: JobInput): Promise<Output>
    
    /** Builds a log of the Job. */
    logger: JobLogger

    constructor(
        protected client: Client,
        protected id?: number,
        protected trx?:TransactionClientContract )
    {
        this.logger = new JobLogger(this.constructor.name, id);
    }

    /** Validates the input */
    async validate(input: JobInput): Promise<void> {
        let validator = new Validator(this.getAlias(), this.getSchema(), this.getNames())
        return validator.validate(input);
    }  

    /** Run this job synchronously:
     *  - Runs immediately
     *  - Returns job output */

    public static async run<D, Out>(
        this: new (client: Client, id?: number, trx?:TransactionClientContract) => Job<D,Out>,
        client: Client,
        input: Record<string,any>,
        trx?:TransactionClientContract
    ): Promise<Out> {
        Console.info(this.name, '@run')

        const job = new this(client, undefined, trx);
        await job.validate(input);
        job.data = await job.rules(input);

        let output = await job.execute(input).catch(e => {
            job.logger.error(e);
            throw e;
        });
        return output
    }

    /* Run this job asynchronously:
     *  - Serialize input into a pool and execute ASAP */
    static async queue<D,T>(
        this: new (client: Client, id?: number, trx?:TransactionClientContract) => Job<D,T>,
        client: Client,
        input: JobInput,
        immediate:boolean = true,
        max_attempts?:number
    ): Promise<WorkerJob> {
        Console.info(this.name, '@queue')

        const job = new this(client, undefined);
        await job.validate(input);
        job.data = await job.rules(input);

        if (!max_attempts) max_attempts = (this as any).max_attemps;

        let worker_job = new WorkerJob();

        worker_job.client_id = client.client_id;
        worker_job.user_id = client.user.id;
        worker_job.company_id = client.user.company_id;

        worker_job.confirmed = immediate;
        worker_job.type = this.name;

        worker_job.input = input;
        worker_job.output = undefined;
        
        worker_job.status = JobStatus.Queued;
        worker_job.attempts = 0;
        worker_job.max_attempts = max_attempts!;

        return worker_job.save();
    }

    getAlias(): string {
        return (this.constructor as typeof Job).alias;
    }

    getSchema(): TypedSchema {
        return (this.constructor as typeof Job).schema;
    }

    getNames(): Record<string,string> {
        return (this.constructor as typeof Job).names;
    }

}