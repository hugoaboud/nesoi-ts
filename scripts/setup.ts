import path from "path";
import Console from "./common/console"
import { DotEnv, DotEnvValidator } from "./common/dotenv"
import Shell from "./common/shell"
import PostgreSQL from "./common/database";

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
        await PostgreSQL.setup(db_name)

    Console.step('Creating Nodes folder')
    Shell.mkdir(path.join('app','Nodes'));
}

main();