import { Client } from "../Auth/Client";
import LogModel from "../Database/Models/LogModel";
import ResourceMachine from "../Resource/ResourceMachine";

export type Level = 'debug' | 'info' | 'warn' | 'error'
export type ReadBy = 'level' | 'event' | 'origin' | 'user_id'

type Scope = ResourceMachine<any,any>

class Logger {

    constructor(
        private scope: 'resource'|'job',
        private scope_name: string,
        private scope_id?: number,
        private user_id?: number
    ) {}

    private async push(
        level: Level,
        event: string,
        origin: string,
        message: string,
        data: Record<string,any>
    ): Promise<LogModel> {
        return LogModel.create({
            level,
            user_id: this.user_id,
            scope: this.scope,
            scope_name: this.scope_name,
            scope_id: this.scope_id,
            event,
            origin,
            message,
            data
        })
    }

    async debug(
        event: string,
        origin: string,
        message: string,
        data: Record<string,any>
    ): Promise<LogModel> {
        return this.push('debug', event, origin, message, data);
    }

    async error(
        event: string,
        origin: string,
        message: string,
        data: Record<string,any>
    ): Promise<LogModel> {
        return this.push('error', event, origin, message, data);
    }

    async warn(
        event: string,
        origin: string,
        message: string,
        data: Record<string,any>
    ): Promise<LogModel> {
        return this.push('warn', event, origin, message, data);
    }

    async info(
        event: string,
        origin: string,
        message: string,
        data: Record<string,any>
    ): Promise<LogModel> {
        return this.push('info', event, origin, message, data);
    }

    async readBy(key: ReadBy, value: string) {
        return LogModel.query().where(key, value);
    }
}

export default function Log(scope: Scope, scope_id?: number, client?: Client) {

    let tag = 'resource' as const;
    if (scope instanceof ResourceMachine) tag = 'resource';

    let scope_name = scope.constructor.name;
    
    return new Logger(tag, scope_name, scope_id, client?.user.id);
}