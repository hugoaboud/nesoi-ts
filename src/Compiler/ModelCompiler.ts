import * as fs from 'fs';
import path from 'path';
import Console from '../Common/Console';
import { Camelize, Plural } from '../Common/String';
import { $ } from './Schema';

const Types = {
    string: 'string',
    int: 'number',
    float: 'number'
};

export default class ModelCompiler {
    
    static CompileProp(prop: $.Prop) {        
        let type = Types[prop.type];
        let nullable = prop.opts.nullable?'?':'';
        let source = '';
        source += `\t@column()\n`;
        source += `\tpublic ${prop.name}${nullable}: ${type}\n\n`;
        return source;
        
    }

    static CompileSchema(schema: $.Node) {
        Console.info('ModelCompiler', `Compiling ${Console.colored(schema.name,'cyan')}`)

        let buf = `import { DateTime } from 'luxon'\n`;
        buf += `import { column } from '@ioc:Adonis/Lucid/Orm'\n`
        buf += `import BaseModel from 'adonis-graph-db/lib/Model'\n\n`

        let class_name = Camelize(schema.name)+'Model';
        buf += `export default class ${class_name} extends BaseModel {\n`;
        buf += `\tpublic static table = '${Plural(schema.name)}'\n\n`;

        schema.props.forEach(prop => {
            buf += this.CompileProp(prop);
        })

        buf += `}`;
    
        return buf;
    }

    static Save(buf: string, out_path: string, name: string) {
        name = Camelize(name) + 'Model.ts'
        let file_path = path.join(out_path,name);
        Console.info('MigrationCompiler', `Saving ${Console.colored(file_path,'green')}`)
        fs.writeFileSync(file_path, buf);   
    }

    static Compile(schema: $.Node, out_path: string) {
        let buf = this.CompileSchema(schema);
        this.Save(buf, out_path, schema.name);
    }

}