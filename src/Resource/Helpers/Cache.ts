import { Client } from "src/Auth/Client";
import ResourceMachine from "../Machines/ResourceMachine";
import Logger from '@ioc:Adonis/Core/Logger'


type EntityCache = Record<number,Promise<Record<string,any>>>
type TypeCache = Record<string,EntityCache>

export default class Cache {

    private cache: TypeCache = {}

    constructor(
        private client: Client
    ) {}

    async readOne(resource: ResourceMachine<any,any>, id: number) {

        const name = resource.name();
        
        this.cache[name] = this.cache[name] || {};
        
        if (!(id in this.cache[name])) {
            this.cache[name][id] = resource.readOne(this.client, id);
        }
        else {
            Logger.info(`(cache) ${resource.name()} id:${id}`);
        }

        return this.cache[name][id];

    }

}