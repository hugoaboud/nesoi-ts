import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { Exception as BaseException } from '@adonisjs/core/build/standalone';
import { Status } from '../Service';
import { Client } from './Client';

export abstract class Auth {

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