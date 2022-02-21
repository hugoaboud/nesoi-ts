import Console from "./common/console"

import Compiler from "../src/Compiler"

/**
 * [ compile ]
 * Run on the project folder to setup everything required for the library to work.
 */


Console.header('Compile')

async function main() {
    
    await Compiler.Compile();

}

main();