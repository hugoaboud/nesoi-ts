import { InputPropT } from "../../Resource/Props/Input";
import { InputSchema } from "../../Resource/Types/Schema";
import { Client } from "../../Auth/Client";
import { isEmpty } from "../../Util/Validator";
import { InputValidator } from "../../Validator/InputValidator";
import { Job, JobSchema } from "../Job2";
import { Exception as BaseException } from '@adonisjs/core/build/standalone';
import { Status } from "../../Service";


export default class Validator<S extends JobSchema> {

    private validator: InputValidator

    constructor(
        private job: Job<S>
    ) {
        this.validator = new InputValidator(job.$.Input);
    }

    /* 
        Input Sanitization
        - Remove internal use '__keys__' 
        - Remove protected/private props according to scope
    */

    // async sanitize(
    //     client: Client,
    //     t: keyof S['Transitions'],
    //     input: Record<string,any>
    // ): Promise<void> {

    //     let scope = 'public';
    //     if (client.stackLength() > 0) {
    //         const last_action = client.getAction(-1);
    //         if (this === last_action.machine) scope = 'private';
    //         else scope = 'protected';
    //     }

    //     if (scope === 'public')
    //         this.filterInternalKeys(input);
    //     if (scope !== 'private')
    //         this.filterInputScope(scope as any, this.machine.$.Transitions[t as any].input, input);
        
    //     input.__scope__ = scope;
    // }

    // private filterInternalKeys(
    //     input: Record<string,any>
    // ): void {
    //     Object.keys(input).map(key => {
    //         const prop = input[key];
    //         if (Array.isArray(prop))
    //             return prop.forEach((i:any) => this.filterInternalKeys(i));
    //         if (typeof prop === 'object')
    //             return this.filterInternalKeys(prop);
    //         if (key.startsWith('__') && key.endsWith('__'))
    //             delete input[key];
    //     })
    // }

    // private filterInputScope(
    //     scope: 'public'|'protected',
    //     schema: InputSchema,
    //     input: Record<string,any>
    // ): void {
    //     Object.keys(schema).map(key => {
    //         const prop = schema[key] as any as InputPropT;
    //         if (prop.scope === 'public' ||
    //             (prop.scope === 'protected' && scope !== 'public')) {
    //             if (prop.members && (key in input))
    //                 this.filterInputScope(scope, prop.members, input[key]);
    //             return;
    //         }
    //         if (Array.isArray(input)) input.forEach((i:any) => delete i[key]);
    //         else delete input[key];
    //     })
    // }

    /* 
        Input Validation
        - Validate presence and type of props
        - Validate runtime/database/service rules
        - Assign default values
    */

    async validate(
        client: Client,
        input: Record<string,any>
    ): Promise<void> {
        const schema = this.job.$.Input;
        await this.validateFields(input);
        this.assignDefaults(schema, input);
        await this.validateRules(client, schema, input, 'runtime');
        await this.validateRules(client, schema, input, 'database');
        await this.validateRules(client, schema, input, 'service');
    }

    private async validateFields(
        input: Record<string,any>
    ): Promise<void> {
        await this.validator.validate(input);
    }

    private assignDefaults(
        schema: InputSchema,
        input: Record<string,any>
    ): void {
        Object.keys(schema).map(key => {
            const prop = schema[key] as any as InputPropT;
            if (prop.default_value === undefined) {
                if (prop.members) {
                    const data = prop.list ? input[key] : [input[key]];
                    if (!data) return;
                    data.forEach((obj:any) => {
                        if (isEmpty(obj)) return;
                        this.assignDefaults(prop.members!, obj)
                    });
                }
                return;
            }
            if (isEmpty(input[key])) input[key] = prop.default_value;
        })
    }

    private async validateRules(
        client: Client,
        schema: InputSchema,
        input: Record<string,any>,
        scope: 'runtime' | 'database' | 'service'
    ): Promise<void> {
        for (let key in schema) {
            if (isEmpty(input[key])) continue;
            
            const prop = schema[key] as any as InputPropT;
            const data = prop.list ? input[key] : [input[key]];
            
            for (let d in data) {
                const obj = data[d];
                if (isEmpty(obj)) continue;

                for (let r in prop.rules) {
                    const rule = prop.rules[r];
                    if (rule.scope !== scope) continue;
                    const ok = await rule.fn(input, key, undefined as any, prop, client);
                    if (!ok) throw Exception.Rule(this.job, rule.msg(prop.alias));
                }

                if (prop.members)
                    await this.validateRules(client, prop.members, obj, scope);
            }
        }  
    }

}

export class Exception extends BaseException {

    constructor(machine: Job<any>, message: string, status: Status) {
        super(message, status, 'E_'+machine.name('UPPER_SNAKE'))
    }

    static Rule(machine: Job<any>, msg: string) {
        return new this(machine, msg, Status.BADREQUEST);
    }

}