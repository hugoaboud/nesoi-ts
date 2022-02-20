import Console from "./common/console"
import Shell from "./common/shell"

/**
 * [ prepare ]
 * This script is run when the package is built and installed.
 */


Console.header('Prepare')

async function main() {
    
    await Shell.cmd('.', 'rm -r lib')

    Console.step('Compile TypeScript files')
    await Shell.cmd('.', 'ttsc')
    
}

main();