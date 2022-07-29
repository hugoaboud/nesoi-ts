import { Exception } from '@adonisjs/core/build/standalone'
import { Status } from '.'

export default class ValidationException extends Exception {

    static code = 'E_VALIDATION_EXCEPTION'
    
    messages: object

    constructor(messages: object, shared = false) {
        super(`Falha de Validação`, shared?Status.INTERNAL_SERVER:Status.BADREQUEST, ValidationException.code);
        this.messages = {errors: messages};
    }

    static Error(alias: string, e: any, shared = false) {

        let messages = Object.keys(e.messages).map(key => {
            let split = key.split('.');
            let index = (split[0] === '_')?split[1]:null;
            return {
                alias,
                key: index?split[2]:key,
                index,
                message: `${shared?'<shared> ':''}${e.messages[key]}`
            }
        })

        return new ValidationException(messages, shared);
    }

    static Required(key: string, name: string) {
        return new ValidationException([{
            key: key,
            message: `${name} requerido(a)`
        }]);
    }

}