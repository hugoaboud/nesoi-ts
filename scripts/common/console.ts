import * as readline from 'readline'
import pack from '../../package.json'

export enum Color {
    black = '0;30',
    red = '0;31',
    green = '0;32',
    brown = '0;33',
    blue = '0;34',
    purple = '0;35',
    cyan = '0;36',
    lightgray = '0;37',
    darkgray = '1;30',
    lightred = '1;31',
    lightgreen = '1;32',
    yellow = '1;33',
    lightblue = '1;34',
    lightpurple = '1;35',
    lightcyan = '1;36'
}

export default class Console {

    // Returns colored message
    static colored(msg: string, color: keyof typeof Color) {
        return '\x1b[' + Color[color] + 'm' + msg + '\x1b[0m'
    }

    // Ask a question and wait for the answer
    static async question(text: string, defaul='', prefix=''): Promise<string> {
        return new Promise(resolve => {
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });
            rl.question(this.colored(text + ' ', 'cyan')+prefix, val => {
                if (!val.length) return;
                rl.close();
                resolve(val);
            })
            rl.write(defaul);
        })
    }

    // Prints a step message to the terminal
    static step(msg: string) {
        console.log(this.colored('- ' + msg, 'green'))
    }

    // Prints the header
    static header(module: string) {                                      
        console.log(this.colored("  _____             _   ____  _____ ", 'lightblue'))
        console.log(this.colored(" |   __|___ ___ ___| |_|    \\| __  |", 'lightblue'))
        console.log(this.colored(" |  |  |  _| .'| . |   |  |  | __ -|", 'lightblue'))
        console.log(this.colored(" |_____|_| |__,|  _|_|_|____/|_____|", 'lightblue'))
        console.log(this.colored("               |_|                  ", 'lightblue'))
        console.log(this.colored("                               "+pack.version, 'cyan'))
        console.log("[ " + module + " ]")
        console.log()
    
    }

}