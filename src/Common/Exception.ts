import Logger from '@ioc:Adonis/Core/Logger'
import HttpExceptionHandler from '@ioc:Adonis/Core/HttpExceptionHandler'
import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import Console from './Console'
import { Exception as BaseException } from '@adonisjs/core/build/standalone';

export class Exception extends BaseException {
  
  constructor(
    public scope: string,
    public msg: string,
    public errors?: Record<string,string|undefined>[],
    status?: number,
    code?: string
  ) {
      super(msg, status, code);
  }

}

/**
    Formats exceptions thrown by the controllers.
*/
export class ExceptionHandler extends HttpExceptionHandler {
  constructor () {
    super(Logger)
  }

  public async handle(e: Exception, ctx: HttpContextContract) {
   
    Console.error(e);

    let errors:any[] = [];
    if (e.errors) {
      errors = e.errors
    }
    else {
      errors = [e.message.replace(e.code+': ','')]
    }

    return ctx.response.status(e.status).send({
      errors: {
        scope: e.scope,
        code: e.code,
        errors
      }
    });
  }
  
}
