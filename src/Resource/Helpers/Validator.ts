
import { Client } from "../../Auth/Client";
import { isEmpty } from "../../Util/Validator";
import { InputValidator } from "../../Validator/InputValidator";
import ResourceMachine from "../Machines/ResourceMachine";
import { Exception, StateMachine } from "../Machines/StateMachine";
import { InputPropT } from "../Props/Input";
import { InputSchema, Schema } from "../Types/Schema";

export default class Validator<S extends Schema> {

    private validator: Record<string, InputValidator> = {}

    constructor(
        private machine: StateMachine<any,S>
    ) {
        Object.keys(machine.$.Transitions).forEach(t => {
            let transition = machine.$.Transitions[t];
            if (!transition.input) return;
            this.validator[t] = new InputValidator(transition.input);
        })
    }

    /*
        Input scope:
        - public: from outside the State Machine
        - protected: from a different State Machine 
        - private: from the same State Machine (always through a Hook)

    */

    /* 
        Input Sanitization
        - Turns empty inputs into {}
        - Remove internal use '__keys__' 
        - Remove protected/private props according to scope
    */

    async sanitize(
        client: Client,
        t: keyof S['Transitions'],
        input: Record<string,any>
    ): Promise<void> {

        if (!input) input = {};

        let scope = 'public';
        if (client.stackLength() > 0) {
            const last_action = client.getAction(-1);
            if (this === last_action.machine) scope = 'private';
            else scope = 'protected';
        }

        if (scope === 'public')
            this.filterInternalKeys(input);
        
        this.filterInputScope(scope as any, this.machine.$.Transitions[t as any].input, input);
        
        input.__scope__ = scope;
    }

    private filterInternalKeys(
        input: Record<string,any>
    ): void {
        if (!input) return;
        Object.keys(input).map(key => {
            const prop = input[key];
            if (!prop) return;
            if (Array.isArray(prop))
                return prop.forEach((i:any) => this.filterInternalKeys(i));
            if (typeof prop === 'object' && !prop.isMultipartFile)
                return this.filterInternalKeys(prop);
            if (key.startsWith('__') && key.endsWith('__'))
                delete input[key];
        })
    }

    // private: no props should be deleted
    // protected: private props should be filtered
    // public: private and protected props should be filtered
    private filterInputScope(
        scope: 'public'|'protected'|'private',
        schema: any,
        input: Record<string,any>
    ): void {
        if (!input) return;
        if (typeof input !== 'object') return;
        if (scope === 'private') return;
    
        Object.keys(schema).map(key => {
            const prop = schema[key] as any;
            const filter = 
                (scope === 'protected' && prop.scope === 'private') ||
                (scope === 'public' && prop.scope !== 'public')
            
            if (!filter) {
                if (prop.list && !Array.isArray(input[key])) return; // prop will trigger a validation error
    
                const data = prop.list ? input[key] : [input[key]];
                if (prop.members)               
                    data.forEach((d:any) => this.filterInputScope(scope, prop.members!, d));
                return;
            }
            
            delete input[key];
        })
    }

    /* 
        Input Validation
        - Validate presence and type of props
        - Validate runtime/database/service rules
        - Assign default values
    */

    async validate(
        client: Client,
        t: keyof S['Transitions'],
        input: Record<string,any>
    ): Promise<void> {
        const schema = this.machine.$.Transitions[t as any].input;
        await this.validateFields(t, input);
        this.assignDefaults(schema, input);
        await this.validateRules(client, schema, input, 'runtime');
        await this.validateRules(client, schema, input, 'database');
        await this.validateRules(client, schema, input, 'service');
    }

    private async validateFields(
        t: keyof S['Transitions'],
        input: Record<string,any>
    ): Promise<void> {
        await this.validator[t as string].validate(input);
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
        scope: 'runtime' | 'database' | 'service',
        resource?: ResourceMachine<any,any>
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
                    const machine = resource ? resource : this.machine;
                    const ok = await rule.fn(input, key, machine, prop, client);
                    if (!ok) throw Exception.Rule(this.machine, rule.msg(prop.alias));
                }

                if (prop.members)
                    await this.validateRules(client, prop.members, obj, scope, prop.child);
            }
        }  
    }

}