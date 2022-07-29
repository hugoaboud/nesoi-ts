import Logger from '@ioc:Adonis/Core/Logger'
import HttpExceptionHandler from '@ioc:Adonis/Core/HttpExceptionHandler'
import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import { Exception } from '@adonisjs/core/build/standalone';

/**
    Formats exceptions thrown by the controllers.
*/
export default class ExceptionHandler extends HttpExceptionHandler {
  constructor () {
    super(Logger)
  }

  public async handle(error: Exception, ctx: HttpContextContract) {
   
      console.error(error)

      let messages:any[] = [];
      const e_messages = (error as any).messages
      if (e_messages) {
          Object.values(e_messages).forEach(msgs => {
              messages.push(...(msgs as any));
          })
      }
      else {
          messages = [error.message.replace(error.code+': ','')]
      }

    return ctx.response.status(error.status).send({
      errors: {
        code: error.code,
        base: messages
      }
    });
  }
  
}
