import { Exception } from "./Common/Exception";
import { validator, schema, rules } from '@ioc:Adonis/Core/Validator'
import { SchemaObject, SchemaArray, SchemaLiteral } from '@ioc:Adonis/Core/Validator'
import { Status } from "./Common/Status";
import i18n from './i18n'

/**
 * Check if a parameter is empty.
 */
 export function isEmpty(val: any): boolean {
    return (val == null || val.length == 0)
}

/**
 * Human names for validator rules.
 */
const Strings = i18n.Validator;

/**
 * Adonis validator rule to treat an optional parameter as
 * required when the data contains no id (is being created).
 */
export const RequiredOnCreate = [rules.requiredIfNotExists('id'), rules.requiredWhen('id', 'in', [0])];

export type ValidationRules = Record<string, {t?: any, getTree(): SchemaObject|SchemaArray|SchemaLiteral}>
export type ValidationNames = Record<string, string>
export type ValidationSchema = {
    rules: ValidationRules,
    names: ValidationNames
}

export default class Validator {   

    messages: Record<string, any>

    /**
     * Build a validator from a schema with optional custom messages.
     */
    constructor(
        protected schema: ValidationSchema,
        messages?: Record<string,string>
    ) {
        this.messages = {
            ...(messages || {}),
            '*': (field:string, rule:string, _ptr:any, options:Record<string,any>) => {
                let address = field.split('.').map(a => schema.names[a] || a);
                let opts = '';
                if (rule === 'enum') opts = options.choices.toString;
                else if (rule === 'minLength') opts = options.minLength;
                return `${address.join('.')} ${Strings.RuleNames[rule as never]}${opts}`
            }
        };
    }    
    
    async Validate(scope: string, data: Record<string, any>) {
        try {
            await validator.validate({ schema: schema.create(this.schema.rules), messages: this.messages, data });
        }
        catch (e) { throw ValidationException.Error(scope, e); }
    }
}

export class ValidationException extends Exception {

    static code = 'E_VALIDATION'

    constructor(
        scope: string,
        errors: Record<string,string|undefined>[]
    ) {
        super(scope, Strings.ExceptionMessage, errors, Status.BADREQUEST, ValidationException.code);
    }

    static Error(scope: string, e: any) {

        let errors = Object.keys(e.messages).map(key => {
            let split = key.split('.');
            let index = (split[0] === '_')?split[1]:undefined;
            return {
                msg: e.messages[key].join(', ') as string,
                key: index?split[2]:key,
                index
            }
        })

        return new ValidationException(scope, errors);
    }

    static Required(scope: string, key: string, name: string) {
        return new ValidationException(scope, [{
            key: key,
            message: name + Strings.RuleNames.required
        }]);
    }

}