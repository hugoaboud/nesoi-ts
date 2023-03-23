import { Verb } from "./Service";

export type DeepPartial<T> = T extends object ? {
    [P in keyof T]?: DeepPartial<T[P]>;
} : T;

export class Config {

    static Default = {
        
        Routing: {
            query_route: '/query',
            edit_verb: 'patch' as Verb,
            suffix: undefined as undefined | string
        },
        Machine: {
            delete_on_edit_flag: '_destroy'
        },
        MultiTenancy: {
            column: 'created_by',
            save_param: 'id',
            read_param: 'id'
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