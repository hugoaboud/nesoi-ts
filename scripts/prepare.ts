import Console from "./common/console"
import Shell from "./common/shell"

/**
 * Adonis Graph DB: Prepare
 * This script is run when the package is built and when it's installed.
 */


Console.header('Prepare')

// const { iocTransformer } = require('@adonisjs/ioc-transformer')

// require('ts-node').register({
//   transformers: {
//     after: [iocTransformer(require('typescript/lib/typescript'), require('../.adonisrc.json'))],
//   }
// })

async function main() {
    
    await Shell.cmd('.', 'rm', ['-r', 'lib'])

    Console.step('Compile TypeScript files')
    await Shell.cmd('.', 'ttsc')
    
}

main();