export namespace str {

    /** Shell color presets */
    export enum Color {
        default = 39,
        black = 30,
        red = 31,
        green = 32,
        orange = 33,
        blue = 34,
        purple = 35,
        cyan = 36,
        lightgray = 37,
        darkgray = 90,
        lightred = 91,
        lightgreen = 92,
        lightyellow = 93,
        lightblue = 94,
        lightpink = 95,
        lightcyan = 96
    }

    /** Formats strings color */
    export class Formatter {

        private _bright?: string
        private _fg?: string
        private _bg?: string
        private _underline?: boolean
        private _blink?: boolean
        private _invert?: boolean

        constructor(
            color?: keyof typeof Color
        ) {
            if (color)
                this._fg = Color[color].toString();
        }
        
        bright() { 
            this._bright = '1';
            return this;
        }
        dim() {
            this._bright = '2';
            return this;
        }
        bg(color: keyof typeof Color) {
            this._bg = (Color[color]+10).toString();
            return this;
        }
        underline() {
            this._underline = true;
            return this;
        }
        blink() {
            this._blink = true;
            return this;
        }
        invert() {
            this._invert = true;
            return this;
        }

        render(msg: string) {
            let args = [
                this._bright,
                this._fg,
                this._bg,
                this._underline?'4':null,
                this._blink?'5':null,
                this._invert?'7':null,
            ].filter(a => a != undefined).join(';')
            let end = [
                '39',
                this._bg?'49':'',
                this._blink?'25':'',
            ].filter(a => a).join(';')
            return `\x1b[${args}m${msg}\x1b[${end}m`;
        }

    }

    const Presets = {
        h0: new Formatter('black').bg('cyan'),
        h1: new Formatter('lightblue'),
        h2: new Formatter('purple'),
        
        info: new Formatter('lightyellow'),
        error: new Formatter('lightred'),
        wait: new Formatter('orange').blink(),
        success: new Formatter('lightgreen'),
        
        dir: new Formatter('lightred'),
        file: new Formatter('lightred'),
        cmd: new Formatter('default').bg('darkgray'),
        
        semidim: new Formatter('lightgray'),
        dim: new Formatter('darkgray'),
        black: new Formatter('black')
    }

    export function h0(str: string) { return Presets.h0.render('  '+str+'  '); }
    export function h1(str: string) { return Presets.h1.render(str); }
    export function h2(str: string) { return Presets.h2.render(str); }
    export function info(str: string) { return Presets.info.render(str); }
    export function error(str: string) { return Presets.error.render(str); }
    export function wait(str: string) { return Presets.wait.render(str); }
    export function success(str: string) { return Presets.success.render(str); }
    export function dir(str: string) { return Presets.dir.render(str); }
    export function file(str: string) { return Presets.file.render(str); }
    export function cmd(str: string) { return Presets.cmd.render(' '+str+' '); }
    export function semidim(str: string) { return Presets.semidim.render(str); }
    export function dim(str: string) { return Presets.dim.render(str); }
    export function black(str: string) { return Presets.black.render(str); }
    export function reset() { return '\x1e[0m'; }

    export function header(): string {
        const version = require(process.cwd()+'/package.json').version;
        return '\n'+
            h1("                                        __             \n") +
            h1("                              __       /\\ \\__          \n") +
            h1("  ___      __    ____    ___ /\\_\\      \\ \\ ,_\\   ____  \n") +
            h1("/' _ `\\  /'__`\\ /',__\\  / __`\\/\\ \\  ____\\ \\ \\/  /',__\\ \n") +
            h1("/\\ \\/\\ \\/\\  __//\\__, `\\/\\ \\L\\ \\ \\ \\/\\___\\\\ \\ \\_/\\__, `\\\n") +
            h1("\\ \\_\\ \\_\\ \\____\\/\\____/\\ \\____/\\ \\_\\/___/ \\ \\__\\/\\____/\n") +
            h1(" \\/_/\\/_/\\/____/\\/___/  \\/___/  \\/_/       \\/__/\\/___/ \n") +
            h1("                                                 "+version)
    }
}