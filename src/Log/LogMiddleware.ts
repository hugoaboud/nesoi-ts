import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Logger from '@ioc:Adonis/Core/Logger'
import { Middleware } from '../Middleware';

/**
    Middleware used to log incoming requests to the terminal.
*/
export default class LogMiddleware extends Middleware {

  public async handle (ctx: HttpContextContract, next: () => Promise<void>) {
    //let prefix = Console.colored('ROUTE', 'lightgreen');
    //let line = Console.line(prefix, ctx.request.request.method!, `${ctx.request.request.url}`)
    Logger.info( `${ctx.request.request.method} ${ctx.request.request.url}`);
    //console.log(line);
    await next()
  }
}
