import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

export abstract class Middleware {
    abstract handle (ctx: HttpContextContract, next: () => Promise<void>): Promise<void>
}