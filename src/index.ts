import BaseModel from "./Model"
import { OutputSchema, PropType } from "./Output"
import { TransitionSchema, TransitionInput, StateSchema, Transition as $Transition, StateMachine } from "./StateMachine"
import { Prop as $Prop } from './Output';
import { InputProp as $InputProp } from './Input';
import { Exception as BaseException } from '@adonisjs/core/build/standalone';

/**
    [Resource Schema]
    Schema which defines the resource behaviour.
*/

export function Schema<
    T extends typeof BaseModel,
    Model extends InstanceType<T>,
    Output extends OutputSchema<Model>,
    States extends StateSchema<Model>,
    Transitions extends TransitionSchema<Model,States>
>(schema: {
    Model: T
    Output: Output
    States: States
    Transitions: Transitions
}) {
    return schema;
}
export type Schema = {
    Model: typeof BaseModel
    Output: OutputSchema<any>
    States: StateSchema<any>
    Transitions: Record<string, $Transition<any,any,any,any>>
}

/**
    [Resource Type]
    Merges the given type properties with transition methods.
*/

export type Type<S extends Schema> = 
    { [k in keyof S['Output']]: PropType<S['Output'][k]> } & 
    Omit<{ [k in keyof S['Transitions']]: (input: TransitionInput<S['Transitions'][k]>) => string }, 'create'>

/**
    [Resource Prop]
    Property of a resource entity.
*/

export const Prop = $Prop

/**
    [Resource InputProp]
    Input validator property.
*/

export const InputProp = $InputProp

/**
    [Resource InputProp]
    Input validator property.
*/

export const Transition = $Transition

/**
    [Resource]
    A custom State Machine for handling data in a database.
*/

type Input<S extends Schema,T extends keyof S['Transitions']> = TransitionInput<S['Transitions'][T]>
type Model<S extends Schema> = InstanceType<S['Model']>

export class Resource< T, S extends Schema > extends StateMachine<S>{

    /* CRUD */

    async create(input: Input<S,'create'>): Promise<T> {
        const obj = new this.$.Model() as Model<S>;
        obj.state = 'void';
        await this.run('create', obj, input);
        await obj.save();
        await obj.refresh();
        return this.build(obj);
    }

    async readAll(): Promise<T[]> {
        const objs = await this.$.Model.query() as Model<S>[];
        return this.buildAll(objs);
    }

    async readOne(id: number): Promise<T> {
        const obj = await this.$.Model.find(id) as Model<S>;
        if (!obj) throw Exception.NotFound(id);
        return this.build(obj);
    }

    private async build(obj: Model<S>): Promise<T> {
        return obj as any;
    }
    
    private async buildAll(objs: Model<S>[]): Promise<T[]> {
        return Promise.all(objs.map(
            async obj => this.build(obj)
        ));
    }

}

class Exception extends BaseException {

    static code = 'E_RESOURCE'

    static NotFound(id: number) {
        return new this(`Não encontrado: ${id}`, 402, this.code);
    }

}