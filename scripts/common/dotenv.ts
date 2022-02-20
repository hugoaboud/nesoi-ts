import * as fs from "fs";

export type DotEnvFile = Record<string,string>
export class DotEnv {

    static path = '.env'

    static load(): DotEnvFile {
        let file = fs.readFileSync(this.path, 'utf-8');
        return file.split('\n').reduce((a: DotEnvFile, line) => {
            let p = line.split('=');
            if (p.length > 1) a[p[0]] = line.split('=')[1]
            return a;
        }, {})
    }

    static save(dotenv: DotEnvFile) {
        let file = Object.keys(dotenv).map(p => p+'='+dotenv[p]).join('\n')
        fs.writeFileSync(this.path, file)
    } 

    static get(key: string) {
        let dotenv = this.load();
        return dotenv[key];
    }

    static set(key: string, value: string) {
        let dotenv = this.load();
        dotenv[key] = value;
        this.save(dotenv);
    }
    
}

export type DotEnvValidatorFile = Record<string,string>
export class DotEnvValidator {

    static path = 'env.ts'

    static load(): DotEnvValidatorFile {
        let file = fs.readFileSync(this.path, 'utf-8');
        let regex = new RegExp(/(\S*?): (.*)\)[, $\n]/gm);
        let validator: DotEnvValidatorFile = {}
        let entry = regex.exec(file);
        while (entry) {
            validator[entry[1]] = entry[2]+')';
            entry = regex.exec(file);
        }
        return validator;
    }

    static save(validator: DotEnvValidatorFile) {
        let file = "import Env from '@ioc:Adonis/Core/Env'\n\n";
        file += "export default Env.rules({\n";
        file += Object.keys(validator).map(p => '\t'+p+': '+validator[p]).join(',\n')
        file += "\n})";
        fs.writeFileSync(this.path, file)
    } 

    static set(key: string, type: 'string'|'number'|'enum', args?: any) {
        let validator = this.load();
        if (args) args = JSON.stringify(args) + ' as const';
        else args = '';
        validator[key] = `Env.schema.${type}(${args})`;
        this.save(validator);
    }
    
}