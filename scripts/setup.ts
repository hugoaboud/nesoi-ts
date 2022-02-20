import Console from "./common/console"
import { DotEnv, DotEnvValidator } from "./common/dotenv"
import Shell from "./common/shell"

/**
 * [ prepare ]
 * Run on the project folder to setup everything required for the library to work.
 */


Console.header('Setup')

async function main() {

    let db_name = await Console.question('Database name:');

    Console.step('Setting up i18n environment')
    DotEnv.set('GRAPH_DB_I18N', 'pt-br')
    DotEnvValidator.set('GRAPH_DB_I18N', 'enum', ['pt-br'])

    Console.step('Installing AdonisJS Lucid ORM')
    await Shell.cmd('.', 'yarn add @adonisjs/lucid')

    Console.step('Configuring AdonisJS Lucid ORM')
    await Shell.cmd('.', 'node ace configure @adonisjs/lucid')

    if (DotEnv.get('DB_CONNECTION') === 'pg')
        postgres(db_name)
}

async function postgres(db_name: string) {
    Console.step('Setting up PostgreSQL environment')
    DotEnv.set('PG_DB_NAME', db_name)
    DotEnvValidator.set('PG_HOST', 'string')
	DotEnvValidator.set('PG_PORT', 'number')
	DotEnvValidator.set('PG_USER', 'string')
	DotEnvValidator.set('PG_PASSWORD', 'string')
	DotEnvValidator.set('PG_DB_NAME', 'string')
}

main();