// v0.7
// @ts-nocheck

import { Exception } from "@adonisjs/core/build/standalone"
import Console from "../Util/Console"

export type Level = 'debug' | 'info' | 'warn' | 'error'

export interface Entry {
    level: Level
    scope: string
    msg: string | Record<string,any>
    timestamp: string
}

export type JobLog = Entry[]

export class JobLogger {

    log: JobLog = []
    
    base_scope: string
    scope: string[] = []

    verbose = Console.enabled()

    constructor(job: string, id?: number) {
        this.base_scope = job + (id?('.'+id):'');
    }

    private push(level: Level, msg: string | Record<string,any>) {
        let entry = {
            level,
            scope: this.scope.join('.'),
            msg,
            timestamp: new Date().toISOString()
        }
        this.toConsole(entry)
        this.log.push(entry)
    }

    private toConsole(entry: Entry) {
        if (!this.verbose) return;
        let scope = this.base_scope + (entry.scope.length?('.'+entry.scope):'');
        if (entry.level === 'error') Console.error(entry.msg as any, scope);
        else Console[entry.level](scope, entry.msg as any);
    }

    pushScope(scope: string) {
        this.scope.push(scope);
    }
    
    popScope() {
        this.scope.pop();
    }

    debug(msg: string) {
        this.push('debug',msg);
    }

    info(msg: string) {
        this.push('info',msg);
    }

    warn(msg: string) {
        this.push('warn',msg);
    }

    error(e: Exception) {
        this.push('error',{
            code: e.code,
            status: e.status,
            message: e.message,
            stack: e.stack?.split('\n')
        });
    }

    static error(job: string, e: Exception, id?: number) {
        let logger = new JobLogger(job, id);
        logger.error(e);
        return logger.log;
    }
    
}