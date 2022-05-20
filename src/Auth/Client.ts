import { TransactionClientContract } from '@ioc:Adonis/Lucid/Database';
import { Schema } from '../Resource/Schema';
import ResourceMachine from '../Resource/ResourceMachine';

export interface User {
    id: number
}

export interface ClientAction<S extends Schema, R extends ResourceMachine<any,S>> {
    resource: R
    transition: keyof R['$']['Transitions']
}

export class Client {
    public trx!: TransactionClientContract
    public stack: ClientAction<any,any>[] = []
    public tokens: Record<string,string> = {}
    constructor(
        public user: User
    ) {}

    pushAction<S extends Schema, R extends ResourceMachine<any,S>>(resource: R, transition: keyof R['$']['Transitions']) {
        this.stack.push({resource, transition});
    }

    popAction() {
        return this.stack.pop();
    }
}