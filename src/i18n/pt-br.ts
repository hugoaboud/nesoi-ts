import { i18nStrings } from "."

const PT_BR: i18nStrings = {

    Validator: {
        ExceptionMessage: 'Falha de Validação',
        RuleNames: {
            required: 'é requerido',
            requiredWhen: 'é requerido',
            requiredIfNotExists: 'é requerido',
            requiredIfExists: 'é requerido',
            string: 'deve ser uma string',
            number: 'deve ser um número',
            enum: 'não possui valor válido. Opções: ',
            boolean: 'deve ser um booleano',
            date: 'deve ser uma data',
            object: 'deve ser um objeto',
            array: 'deve ser uma lista',
            minLength: 'não possui o tamanho mínimo: '
        }
    },

    Schema: {
        RuleExceptions: {
            greaterThan: 'deve ser maior do que',
            greaterThanOrEqualTo: 'deve ser maior ou igual a',
            lessThan: 'deve ser menor do que',
            lessThanOrEqualTo: 'deve ser maior ou igual a'
        }
    }

}
export default PT_BR