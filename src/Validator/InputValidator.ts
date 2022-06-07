import { Exception as BaseException } from '@adonisjs/core/build/standalone';
import { schema, rules, TypedSchema } from '@ioc:Adonis/Core/Validator'
import { InputProp } from '../Resource/Input';
import { InputSchema } from "../Resource/Schema";
import { Status } from '../Service';

/** 
    [Resource Input Validator]
    Build AdonisJS validator from Input Schemas.
*/

export abstract class InputValidator {

    static fromSchema(input: InputSchema): TypedSchema {
        input = JSON.parse(JSON.stringify(input));
        Object.keys(input).forEach(k => {
            let prop = input[k] as any as InputProp<any>;
            this.checkProp(k, input[k]);
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

    private static checkProp(name: string, prop: InputProp<any>): void {
        if (prop.type === 'id') {
            if (!prop.list && !name.endsWith('_id'))
                throw Exception.InvalidIDPropName(name);
            else if (prop.list && !name.endsWith('_ids'))
                throw Exception.InvalidIDsPropName(name);
        }
    }

    private static fromProp(prop: InputProp<any>): Record<string,any> {
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
            child: 'object',
            id: 'number'
        }[prop.type];
        
        let validator = prop.list ? schema.array : (schema as any)[type];

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
            if (type === 'date') validator = validator.optional(undefined, requiredWhen);
            validator = validator.optional(requiredWhen);
        }
        else {
            if (prop.type === 'enum') validator = validator(prop.options);
            else validator = validator();
        }

        if (prop.list && prop.type !== 'child') {
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