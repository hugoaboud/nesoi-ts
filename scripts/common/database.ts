import Console from "./console"
import { DotEnv, DotEnvValidator } from "./dotenv"
import Shell from "./shell"

export default class Database {
    static async runMigrations() {
        Console.step('Running migrations')
        await Shell.cmd('.','node ace migration:run')
    }
    static async rollbackMigrations() {
        Console.step('Rolling back migrations')
        await Shell.cmd('.','node ace migration:rollback')
    }
}

export class PostgreSQL {

    static async setup(db_name: string) {
        Console.step('Setting up PostgreSQL environment')
        let db_user = await Console.question('PostgreSQL user:');
        let db_password = await Console.question('PostgreSQL password:');

        DotEnv.set('PG_USER', db_user)
        DotEnv.set('PG_PASSWORD', db_password)
        DotEnv.set('PG_DB_NAME', db_name)
        DotEnvValidator.set('PG_HOST', 'string')
        DotEnvValidator.set('PG_PORT', 'number')
        DotEnvValidator.set('PG_USER', 'string')
        DotEnvValidator.set('PG_PASSWORD', 'string')
        DotEnvValidator.set('PG_DB_NAME', 'string')

        Console.step('Installing pgtools')
        await Shell.cmd('node_modules/adonis-graph-db','yarn add --dev pgtools');

        await this.createDatabase()
    }

    static async createDatabase() {
        Console.step('Creating PostgreSQL database')
        let envfile = DotEnv.load()
        const pgtools = require('pgtools')
        return new Promise((resolve, reject) => {
            pgtools.createdb({
                user: envfile.PG_USER,
                password: envfile.PG_PASSWORD,
                port: envfile.PG_PORT,
                host: envfile.PG_HOST,
            }, envfile.PG_DB_NAME, (err:any, res:any) => {
                if (res) resolve(res);
                else if (err) reject(err);
            });
        }).catch(e => {
            if (e.name !== 'duplicate_database') throw (e);
            console.log(`Database ${envfile.PG_DB_NAME} already exists. Moving on.`)
        })
    }

}