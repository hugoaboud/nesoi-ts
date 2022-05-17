import Console from "../scripts/common/console"

import Compiler from "../src/Compiler"
import Database from "../scripts/common/database";

/**
 * [ compile ]
 * Run on the project folder to setup everything required for the library to work.
 */


Console.header('Compile')

async function main() {
    
    let rollback_migrations = await Console.yesOrNo('Rollback migrations?','y');
    if (rollback_migrations) await Database.rollbackMigrations();

    await Compiler.Compile();

    let run_migrations = await Console.yesOrNo('Run migrations?','y');
    if (run_migrations) await Database.runMigrations();

}

main();