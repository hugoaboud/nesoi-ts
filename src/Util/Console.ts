/*
	iCertus Framework
	[ Common/Console ]

	Utility functions for the console.
*/

import { Exception } from "@adonisjs/core/build/standalone";
import { inspect } from 'util'

enum LogLevel {
	ERROR = 0,
	WARN = 1,
	INFO = 2,
	DEBUG = 3
}

const LOG_LEVEL = {
	testing: LogLevel.WARN,
	development: LogLevel.DEBUG,
	production: LogLevel.ERROR
}[process.env.NODE_ENV!] || LogLevel.DEBUG;

export default class Console {
	
	static colored(msg: string, color?: string): string {
		if (!color) return msg;
		let pre = {
			black: '0;30',
			red: '0;31',
			green: '0;32',
			brown: '0;33',
			blue: '0;34',
			purple: '0;35',
			cyan: '0;36',
			lightgray: '0;37',
			darkgray: '1;30',
			lightred: '1;31',
			lightgreen: '1;32',
			yellow: '1;33',
			lightblue: '1;34',
			lightpurple: '1;35',
			lightcyan: '1;36'
		}[color]
		if (!pre) return msg;
		return '\x1b[' + pre + 'm' + msg + '\x1b[0m'
	}

    static line(level: string, scope: string, msg: string) {
        return `${new Date().toISOString()} ${level} ${this.colored('('+scope+')', 'lightgray')} ${msg}`        
    }

	static error(e: Exception, scope?:string): void {

		let stack = e.stack as any as string[];
		if (typeof e.stack === 'string') stack = e.stack.split('\n')

		if (!scope && stack) {
			if (stack.length >= 2) {
                let match = stack[2].match(/at .*\/(.*\.[tj]s)/g);
                if (match) {
                    let terms = match[0].split('/');
                    scope = terms[terms.length - 1];
                }
            }
		}
		if (!scope) scope = '';

		console.error(this.line(this.colored('ERROR','lightred'),scope,this.colored(e.message,'lightred')));
		if ((e as any).messages) {
			let lines = JSON.stringify((e as any).messages,undefined,2).split('\n')
			let msg = lines.map(l => this.colored(l,'red')).join('\n');
			console.error(msg);
		}
		if (stack) {
			let msg = stack.map(l => this.colored(l,'red')).join('\n');
			console.error(msg);
		}
	}

	static warn(scope: string, msg: string): void {		
		if (LOG_LEVEL < LogLevel.WARN) return;
        console.warn(this.line(this.colored('WARN ','yellow'),scope,this.colored(msg, 'yellow')));
	}

	static info(scope: string, msg: string): void {
		if (LOG_LEVEL < LogLevel.INFO) return;
        console.warn(this.line(this.colored('INFO ','green'),scope,msg));
	}

	static debug(scope: string, msg: number | string | Record<string,any> | any[]): void {
		if (LOG_LEVEL < LogLevel.DEBUG) return;
		if (typeof msg === 'string' || typeof msg === 'number') {
			msg = this.colored(msg.toString(),'lightcyan');
		}
		else {
			let lines = inspect(msg).split('\n')
			msg = lines.map(l => this.colored(l,'lightcyan')).join('\n');
		}
		console.warn(this.line(this.colored('DEBUG','lightcyan'),scope,msg));
	}

	static enabled():boolean {
		if (process.env.NODE_ENV === 'testing') return false;
		return true;
	}
}