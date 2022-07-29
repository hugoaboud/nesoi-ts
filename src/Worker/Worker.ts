// v0.7
// @ts-nocheck

import Client from "../App";
import { Job } from "./Job";
import WorkerJob, { JobStatus } from "../Database/Models/WorkerJob";
import WorkerToken from "../Database/Models/WorkerToken";
import { Exception as BaseException } from '@adonisjs/core/build/standalone';
import { Status } from "../Exception";
import OAuth from "../Auth/Helpers/OAuth";
import WorkerLog from "../Database/Models/WorkerLog";
import { JobLog, JobLogger } from "./JobLog";
import Console from "../Util/Console";

export default class Worker {
    
    sleep: number
    timeout?: NodeJS.Timeout

    jobs: Record<string, typeof Job> = {}

    constructor() {
        this.sleep = parseInt(process.env.WORKER_SLEEP!);
        this.Run();
    }

    async Run(): Promise<void> {

        let next = await this.getNextJob();
        if (!next) {
            this.timeout = setTimeout(this.Run.bind(this), this.sleep);
            return;
        }

        this.RunJob(next).then(() => {
            this.timeout = setTimeout(this.Run.bind(this), 1);
        }).catch(async e => {
            console.error(e);
            next!.status = JobStatus.Error;
            await next!.save();
        });
    }

    async Stop() {
        if (this.timeout) clearTimeout(this.timeout);
    }

    async RunJob(worker_job: WorkerJob): Promise<void> {
        Console.info(worker_job.type+'.'+worker_job.id, '@auth')
        let tokens = await this.getTokens(worker_job).catch(async e => {
            await this.Unauthorize(worker_job, e);
        });
        if (!tokens) return;

        let client = await OAuth.ClientFromToken(tokens.access_token).catch(async () => {

            Console.info(worker_job.type+'.'+worker_job.id, '@auth_refresh')
            let new_access_token = await OAuth.Refresh(tokens!.refresh_token).catch(async e => {
                await this.Unauthorize(worker_job, e);
            });
            if (!new_access_token) return;

            let new_client = await OAuth.ClientFromToken(new_access_token).catch(async e => {
                await this.Unauthorize(worker_job, e);
            })
            return new_client;
        });
        if (!client) return;

        Console.info(worker_job.type, '@run_queued')
        worker_job.attempts++;
        worker_job.status = JobStatus.Running;
        await worker_job.save();

        let job = this.NewJob(client, worker_job);

        let output = await job.execute(worker_job.input).catch(async e => {
            await this.Error(worker_job, e, job.logger.log);
        });
        if (!output) return;

        worker_job.status = JobStatus.Done;
        worker_job.output = output;
        await worker_job.save();

        await this.SaveLog(worker_job, job.logger.log);
        Console.info(worker_job.type+'.'+worker_job.id, '@done')
    }

    async getNextJob(): Promise<WorkerJob|undefined> {

        let next = await WorkerJob.query()
            .where('status', JobStatus.Queued)
            .andWhere('confirmed', true)
            .orderBy('id','asc')
            .limit(1)

        return next[0];
    }

    async getTokens(worker_job: WorkerJob): Promise<WorkerToken> {
        let token = await WorkerToken.findBy('company_id', worker_job.company_id);
        if (!token) throw Exception.WorkerTokenNotFound();
        return token;
    }

    NewJob(client: Client, worker_job: WorkerJob): Job<any,any> {
        if (!this.jobs[worker_job.type]) {
            const Job = require.main?.require('./app/Jobs/'+worker_job.type);
            this.jobs[worker_job.type] = Job.default;
        }
        return new (this.jobs[worker_job.type] as any)(client, worker_job.id);
    }

    async SaveLog(worker_job: WorkerJob, log: JobLog) {
        let worker_log = new WorkerLog();
        worker_log.job_id = worker_job.id;
        worker_log.attempt = worker_job.attempts;
        worker_log.log = log;
        await worker_log.save();
    }

    async Unauthorize(worker_job: WorkerJob, e: Exception) {
        worker_job.status = JobStatus.Unauthorized;
        await worker_job.save();
        await this.SaveLog(worker_job,JobLogger.error(worker_job.type, e, worker_job.id));
    }

    async Error(worker_job: WorkerJob, e: Exception, log?: JobLog) {
        if (worker_job.attempts >= worker_job.max_attempts) {
            worker_job.status = JobStatus.Error;
        }
        else {
            worker_job.status = JobStatus.Queued;
        }
        await worker_job.save();
        if (!log) log = [];
        log.push(...JobLogger.error(worker_job.type, e, worker_job.id))
        await this.SaveLog(worker_job,log);
    }

}

class Exception extends BaseException {

    static code = 'E_WORKER'
    
    static WorkerTokenNotFound() {
        return new this('WorkerToken não encontrado', Status.UNAUTHORIZED, this.code)
    }
}