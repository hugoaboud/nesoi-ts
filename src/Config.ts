import { Verb } from "./Service";

export type DeepPartial<T> = T extends object ? {
    [P in keyof T]?: DeepPartial<T[P]>;
} : T;

export class Config {

    static Default = {
        
        Routing: {
            query_route: '/query',
            edit_verb: 'patch' as Verb,
        },
        MultiTenancy: {
            column: 'created_by',
            user_key: 'id'
        }

    }

    static App = {} as DeepPartial<typeof Config.Default>

    static set(app_config: DeepPartial<typeof Config.Default>) {
        this.App = app_config;
    }

    static get<K extends keyof typeof Config.Default>(scope: K): typeof Config.Default[K] {
        if (this.App[scope] !== undefined) return this.App[scope] as any;
        return this.Default[scope];
    }

}