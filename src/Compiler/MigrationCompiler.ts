import * as fs from 'fs';
import path from 'path';
import Console from '../Common/Console';
import { Camelize, Plural } from '../Common/String';
import { $ } from './Schema';

const Types = {
    string: 'string',
    int: 'integer',
    float: 'float'
};

export default class MigrationCompiler {

    static CompileProp(prop: $.Prop) {
        let type = Types[prop.type];
        let nullable = prop.opts.nullable?'':'.notNullable()';
        return `\t\t\ttable.${type}('${prop.name}')${nullable}\n`;
    }

    static CompileSchema(schema: $.Node) {
        Console.info('MigrationCompiler', `Compiling ${Console.colored(schema.name,'cyan')}`)

        let buf = `import BaseSchema from '@ioc:Adonis/Lucid/Schema'\n\n`;

        let class_name = Plural(Camelize(schema.name));
        buf += `export default class ${class_name} extends BaseSchema {\n`;
        buf += `\tprotected tableName = '${Plural(schema.name)}'\n\n`;

        buf += `\tpublic async up () {\n`;
        buf += `\t\tthis.schema.createTable(this.tableName, (table) => {\n`;
        buf += `\t\t\ttable.increments('id')\n\n`;

        schema.props.forEach(prop => {
            buf += this.CompileProp(prop);
        })

        buf += `\n\t\t\ttable.integer('created_by')\n`;
        buf += `\t\t\ttable.integer('deleted_by')\n`;

        buf += `\n\t\t\ttable.timestamp('deleted_at', { useTz: true })\n`;
        buf += `\t\t\ttable.timestamp('created_at', { useTz: true })\n`;
        buf += `\t\t\ttable.timestamp('updated_at', { useTz: true })\n`;
        buf += `\t\t})\n`;
        buf += `\t}\n\n`;

        buf += `\tpublic async down () {\n`;
        buf += `\t\tthis.schema.dropTable(this.tableName)\n`;
        buf += `\t}\n`;
        buf += `}`;

        return buf;
    }

    static Save(buf: string, out_path: string, name: string) {
        name = Plural(name) + '.ts'
        let file_path = path.join(out_path,name);
        Console.info('MigrationCompiler', `Saving ${Console.colored(file_path,'green')}`)
        fs.writeFileSync(file_path, buf);   
    }

    static Compile(schema: $.Node, out_path: string) {
        let buf = this.CompileSchema(schema);
        this.Save(buf, out_path, schema.name);
    }

}