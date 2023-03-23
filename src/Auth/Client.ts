import { TransactionClientContract } from '@ioc:Adonis/Lucid/Database';
import ResourceMachine from '../Resource/Machines/ResourceMachine';
import Cache from '../Resource/Helpers/Cache';
import { Schema } from '../Resource/Types/Schema';

export interface User {
    id: number
    company_id: number
}

export interface ClientAction<S extends Schema, R extends ResourceMachine<any,S>> {
    machine: R,
    model: R['$']['Model'],
    transition: keyof R['$']['Transitions']
}

export class Client {
    
    public trx!: TransactionClientContract
    public stack: ClientAction<any,any>[] = []

    protected cache: Cache

    constructor(
        public user: User,
        public tokens: Record<string,string> = {},
        public super_tenant: string[] = []
    ) {
        this.cache = new Cache(this);
    }

    pushAction<S extends Schema, M extends ResourceMachine<any,S>>(machine: M, model: M['$']['Model'], transition: keyof M['$']['Transitions']) {
        this.stack.push({machine, model, transition});
    }

    popAction() {
        return this.stack.pop();
    }

    stackLength() {
        return this.stack.length;
    }

    getAction(index: number) {
        if (index < 0)
            return this.stack[this.stack.length+index];
        else return this.stack[index];
    }

    getCache() {
        return this.cache;
    }

}