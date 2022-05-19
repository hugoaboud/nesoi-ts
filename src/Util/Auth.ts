import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { Exception as BaseException } from '@adonisjs/core/build/standalone';
import { Status } from './Service';
import { TransactionClientContract } from '@ioc:Adonis/Lucid/Database';
import { Resource, Schema } from '../Resource';

export interface User {
    id: number
}

export interface ClientAction<S extends Schema, R extends Resource<any,S>> {
    resource: R
    transition: keyof R['$']['Transitions']
}

export class Client {
    public trx!: TransactionClientContract
    public stack: ClientAction<any,any>[] = []
    constructor(
        public user: User
    ) {}

    pushAction<S extends Schema, R extends Resource<any,S>>(resource: R, transition: keyof R['$']['Transitions']) {
        this.stack.push({resource, transition});
    }

    popAction() {
        return this.stack.pop();
    }
}

export abstract class EndpointAuth {
    abstract auth(ctx: HttpContextContract): Promise<Client>
    abstract error(ctx: HttpContextContract, e: Error): string

    public async handle (ctx: HttpContextContract, next: () => Promise<void>) {
        (ctx as any).client = await this.auth(ctx).catch(e => {
            throw Exception.AuthFailed(this.error(ctx, e));
        });
        await next()
    }
}

class Exception extends BaseException {

    static code = 'E_AUTH'

    static AuthFailed(message: string) {
        return new this(message, Status.UNAUTHORIZED, this.code);
    }

}