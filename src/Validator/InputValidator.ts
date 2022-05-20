import { schema, rules, TypedSchema } from '@ioc:Adonis/Core/Validator'
import { InputProp } from '../Resource/Input';
import { InputSchema } from "../Resource/Schema";

/** 
    [Resource Input Validator]
    Build AdonisJS validator from Input Schemas.
*/

export abstract class InputValidator {

    static fromSchema(input: InputSchema): TypedSchema {
        input = JSON.parse(JSON.stringify(input));
        Object.keys(input).forEach(k => {
            let prop = input[k] as any as InputProp<any>;
            let validator = this.fromProp(input[k] as any) as any;
            if (prop.members) {
                const members = this.fromSchema(prop.members);
                if (prop.type === 'children')
                    validator = validator.members(schema.object().members(members))
                else 
                    validator = validator.members(members);
            }
            input[k] = validator;
        })
        return input as any;
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
            children: 'array'
        }[prop.type];
        let validator = (schema as any)[type];
        
        let rule = []
        if (prop.required !== true || prop.scope !== 'public')
            validator = validator.optional;
        if (typeof prop.required === 'object')
            rule.push(rules.requiredWhen(prop.required.param, 'in', [prop.required.value]))
        if (prop.required) {
            if (prop.scope === 'protected')
                rule.push(rules.requiredWhen('__scope__', 'in', ['protected','private']))
            else if (prop.scope === 'private')
                rule.push(rules.requiredWhen('__scope__', 'in', ['private']))
        }
    
        if (rule.length) {
            if (type === 'enum') return validator(prop.options, rule);
            if (type === 'date') return validator(undefined, rule);
            return validator(rule);
        }
        
        if (prop.type === 'enum') return validator(prop.options);
        return validator();
    }

}