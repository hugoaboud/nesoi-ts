import { Exception as BaseException } from '@adonisjs/core/build/standalone';
import { validator, rules, schema, TypedSchema, ParsedTypedSchema } from '@ioc:Adonis/Core/Validator'
import { InputSchema } from '../Resource/Types/Schema';
import { InputPropT } from '../Resource/Props/Input';
import { Status } from '../Service';

const RuleMessage = {
    required: 'é requerido',
    requiredWhen: 'é requerido',
    requiredIfNotExists: 'é requerido',
    requiredIfExists: 'é requerido',
    object: 'não é um objeto',
    array: 'não é um array',
    string: 'não é uma string',
    number: 'não é um número',
    enum: 'não possui valor válido. Opções: ',
    enumSet: 'possui um valor inválido. Opções: ',
    boolean: 'não é um booleano',
    date: 'não é uma data'
} as Record<string,string>;

/** 
    [Resource Input Validator]
    Build AdonisJS validator from Input Schemas.
*/

export class InputValidator {

    schema: ParsedTypedSchema<TypedSchema>
    messages: Record<string,any>

    constructor(
        input: InputSchema
    ) {
        this.messages = {
            '*': (field:string, rule: string, _ptr:any, options:Record<string,any>) => {
                const prop = input[field] as any as InputPropT | undefined 
                const alias = prop?.alias || field
                const options_str = (rule === 'enum' || rule === 'enumSet') ? options.choices.toString() : ''
                rule = RuleMessage[rule] || rule
                return alias + ' ' + rule + options_str
            },
            'file.size': 'O arquivo deve ser menor do que {{ options.size }}',
            'file.extname': 'Extensão inválida. Permitidas: {{ options.extnames }}'
        }
        this.schema = schema.create(InputValidator.fromSchema(input))
    }

    async validate(data: Record<string, any>) {
        return validator.validate({
            schema: this.schema,
            data,
            //@ts-ignore
            messages: this.messages
        })
    }

    static fromSchema(input: InputSchema): TypedSchema {
        input = Object.assign({}, input);
        Object.keys(input).forEach(k => {
            let prop = input[k] as any as InputPropT;
            this.checkProp(k, input[k] as any);
            let validator = this.fromProp(input[k] as any) as any;
            if (prop.members) {
                const members = this.fromSchema(prop.members);
                if (prop.list)
                    validator = validator.members(schema.object().members(members))
                else 
                    validator = validator.members(members);
            }
            input[k] = validator;
        })
        return input as any;
    }

    private static checkProp(name: string, prop: InputPropT): void {
        if (prop.type === 'id') {
            if (!prop.list && !name.endsWith('_id'))
                throw Exception.InvalidIDPropName(name);
            else if (prop.list && !name.endsWith('_ids'))
                throw Exception.InvalidIDsPropName(name);
        }
    }

    private static fromProp(prop: InputPropT): Record<string,any> {
        const type = {
            int: 'number',
            float: 'number',
            money: 'number',
            string: 'string',
            boolean: 'boolean',
            enum: 'enum',
            date: 'date',
            datetime: 'date',
            object: 'object',
            transition: 'object',
            id: 'number'
        }[prop.type];
        
        let p = type;
        if (prop.list) {
            if (p === 'enum') p = 'enumSet'
            else p = 'array'
        }

        let validator = (schema as any)[p];

        let requiredWhen = []
        if (typeof prop.required === 'object')
            requiredWhen.push(rules.requiredWhen(prop.required.param, 'in', [prop.required.value]))
        if (prop.required) {
            if (prop.scope === 'protected')
                requiredWhen.push(rules.requiredWhen('__scope__', 'in', ['protected','private']))
            else if (prop.scope === 'private')
                requiredWhen.push(rules.requiredWhen('__scope__', 'in', ['private']))
        }

        if (prop.required === false || requiredWhen.length) {
            if (type === 'enum') validator = validator.optional(prop.options, requiredWhen);
            else if (type === 'date') validator = validator.optional(undefined, requiredWhen);
            else validator = validator.optional(requiredWhen);
        }
        else {
            if (prop.type === 'enum') validator = validator(prop.options);
            else validator = validator();
        }

        if (prop.list && !prop.members && prop.type !== 'enum') {
            validator = validator.members((schema as any)[type]())
        }

        return validator;
    }

}

class Exception extends BaseException {

    static code = 'E_INPUT_VALIDATOR'

    static InvalidIDPropName(name: string) {
        return new this(`O nome da propriedade '${name}' do tipo id deve terminar com '_id'`, Status.INTERNAL_SERVER, this.code);
    }

    static InvalidIDsPropName(name: string) {
        return new this(`O nome da propriedade '${name}' do tipo id[] deve terminar com '_ids'`, Status.INTERNAL_SERVER, this.code);
    }

}