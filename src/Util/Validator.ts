/*
	iCertus Framework
	[ Common/Validator ]

	Used to validate user input and throw comprehensive exceptions
    in case the input doesn't match the schema.
*/

import { validator, schema, rules, TypedSchema } from '@ioc:Adonis/Core/Validator'
import ValidationException from '../Exception/ValidationException';

export type ValidatorSchema = TypedSchema

/**
 * Human names for validator rules.
 */
const ValidatorRuleNames = {
    'required': 'é requerido',
    'requiredWhen': 'é requerido',
    'requiredIfNotExists': 'é requerido',
    'requiredIfExists': 'é requerido',
    'string': 'não é uma string',
    'number': 'não é um número',
    'enum': 'não possui valor válido. Opções: ',
    'boolean': 'não é um booleano',
    'date': 'não é uma data'
};

/**
 * Adonis validator rule to treat an optional parameter as
 * required when the data contains no id (is being created).
 */
export const RequiredOnCreate = [
    rules.requiredIfNotExists('id'),
    rules.requiredWhen('id', 'in', [0])
];


/**
 * Check if a parameter is empty.
 */
export function isEmpty(val: any): boolean {
    return (val == null || val.length == 0)
}

/**
 * Validator class used by the Handler to throw comprehensive exceptions
 * during creation/update of resources.
 */
 export class Validator {   

    messages: Record<string, any>

    /**
     * Build a validator from a schema and a names dictionary.
     */
    constructor(
        protected alias: string,
        protected schema: TypedSchema,
        names: Record<string,string>
    ) {
        this.messages = {
            '*': (field:string, rule:string, _ptr:any, options:Record<string,any>) => {
                let address = field.split('.')
                let parent = names[address[address.length-3]] || address[address.length-3];
                let index = address[address.length-2];
                let name = names[address[address.length-1]] || address[address.length-1];
                return `${(parent && parent!=='_')?(parent + '/' + index + '/'):''}${name} ${ValidatorRuleNames[rule as never] || rule}${rule === 'enum'?options.choices.toString():''}`
            },
            'file.size': 'O arquivo deve ser menor do que {{ options.size }}',
            'file.extname': 'Extensão inválida. Permitidas: {{ options.extnames }}'
        };
    }
    
    /**
     * Validate data.
     */
    async validate(data: Record<string, any>) {
        try {
            await validator.validate({ schema: schema.create(this.schema), messages: this.messages, data });
        }
        catch (e) { throw ValidationException.Error(this.alias, e); }
    }
}