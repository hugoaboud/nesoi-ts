import { Exception } from "./Exception";

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

    private static line(level: string, scope: string, msg: string) {
        return `${new Date().toISOString()} ${level} ${this.colored('('+scope+')', 'lightgray')} ${msg}`        
    }

	static error(e: Exception): void {

		let scope = e.scope;
		if (!scope) {
			let stack = e.stack!.split('\n')
			if (stack.length >= 2) {
                let match = stack[2].match(/(\(.*)\.[tj]s/g);
                if (match) {
                    let terms = match[0].split('/');
                    scope = terms[terms.length - 1];
                }
            }
		}

		console.error(this.line(this.colored('ERROR','lightred'),scope,this.colored(e.message,'lightred')));
		if (e.errors) {
			let lines = JSON.stringify(e.errors,undefined,2).split('\n')
			let messages = lines.map(l => this.colored(l,'lightred')).join('\n');
			console.error(messages);
		}
		let lines = e.stack?.split('\n') || []
		let stack = lines.map(l => this.colored(l,'lightred')).join('\n');
        console.error(stack);
	}

	static warn(scope: string, msg: string): void {
        console.warn(this.line(this.colored('WARN ','yellow'),scope,this.colored(msg, 'yellow')));
	}

	static info(scope: string, msg: string): void {
        console.warn(this.line(this.colored('INFO ','green'),scope,msg));
	}

	static debug(scope: string, msg: string): void {
		console.warn(this.line(this.colored('DEBUG','lightcyan'),scope,this.colored(msg,'lightcyan')));
	}
}