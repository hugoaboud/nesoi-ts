import * as fs from 'fs';
import path from 'path';
import Console from '../Common/Console';
import { Camelize, Plural } from '../Common/String';
import { $ } from './Schema';

const Types = {
    string: 'string',
    int: 'number'
};

export default class ModelCompiler {
    
    static CompileProp(prop: $.Prop) {
        let type = Types[prop.type];
        let nullable = prop.nullable?'?':'';
        let source = '';
        source += `\t@column()\n`;
        source += `\tpublic ${prop.name}${nullable}: ${type}\n\n`;
        return source;
        
    }

    static CompileSchema(schema: $.Node) {
        Console.info('ModelCompiler', `Compiling ${Console.colored(schema.alias,'lightcyan')} ${Console.colored('('+schema.name+')','cyan')}`)

        let file = `import { DateTime } from 'luxon'\n`;
        file += `import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'\n\n`

        let class_name = Camelize(schema.name)+'Model';
        file += `export default class ${class_name} extends BaseModel {\n`;
        file += `\tpublic static table = '${Plural(schema.name)}'\n\n`;

        file += `\t@column({ isPrimary: true })\n`;
        file += `\tpublic id: number\n\n`;

        schema.props.forEach(prop => {
            file += this.CompileProp(prop);
        })

        file += `\t@column.dateTime({ autoCreate: true })\n`;
        file += `\tpublic createdAt: DateTime\n\n`;
        
        file += `\t@column.dateTime({ autoCreate: true, autoUpdate: true })\n`;
        file += `\tpublic updatedAt: DateTime\n`;
        
        file += `}`;
    
        return file;
    }

    static Compile(schemas: $.Node[], out_path: string) {
        Console.info('ModelCompiler', '@start')
        let models = schemas.map(schema => ({
            name: Camelize(schema.name),
            file: this.CompileSchema(schema)
        }));
        
        Console.info('ModelCompiler', `Saving model files to ${Console.colored(out_path,'green')}`)
        models.forEach(migration => {
            let name = migration.name + 'Model.ts';
            let file_path = path.join(out_path,name);
            fs.writeFileSync(file_path, migration.file);
        })
    }

}