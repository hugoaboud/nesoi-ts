import { Client } from "../../Auth/Client";
import ResourceMachine from "../Machines/ResourceMachine";
import Logger from '@ioc:Adonis/Core/Logger'
import { Tenancy } from "../Model";


type EntityCache = Record<number,Promise<Record<string,any>>>
type TypeCache = Record<string,EntityCache>

export default class Cache {

    private cache: TypeCache = {}

    constructor(
        private client: Client
    ) {}

    async readOne(resource: ResourceMachine<any,any>, id: number, tenancy: Tenancy = 'default') {

        const name = resource.name();
        
        this.cache[name] = this.cache[name] || {};
        
        if (!(id in this.cache[name])) {
            this.cache[name][id] = resource.readOne(this.client, id, false, tenancy);
        }
        else {
            Logger.info(`(cache) ${resource.name()} id:${id}`);
        }

        return this.cache[name][id];

    }

    async readOneFromModel(model: LucidModel, id: number) {

        const name = 'model.' + model.name;
        
        this.cache[name] = this.cache[name] || {};
        
        if (!(id in this.cache[name])) {
            this.cache[name][id] = model.find(id) as any;
        }
        else {
            Logger.info(`(cache) ${name} id:${id}`);
        }

        return this.cache[name][id];

    }

}
