import * as fs from 'fs';
import path from 'path';
import Console from '../Common/Console';
import { Camelize, Plural } from '../Common/String';
import { $ } from './Schema';

const Types = {
    string: 'string',
    int: 'integer'
};

export default class MigrationCompiler {

    static CompileProp(prop: $.Prop) {
        let type = Types[prop.type];
        let nullable = prop.nullable?'':'.notNullable()';
        return `\t\t\ttable.${type}('${prop.name}')${nullable}\n`;
    }

    static CompileSchema(schema: $.Node) {
        Console.info('MigrationCompiler', `Compiling ${Console.colored(schema.alias,'lightcyan')} ${Console.colored('('+schema.name+')','cyan')}`)

        let file = `import BaseSchema from '@ioc:Adonis/Lucid/Schema'\n\n`;

        let class_name = Plural(Camelize(schema.name));
        file += `export default class ${class_name} extends BaseSchema {\n`;
        file += `\tprotected tableName = '${Plural(schema.name)}'\n\n`;

        file += `\tpublic async up () {\n`;
        file += `\t\tthis.schema.createTable(this.tableName, (table) => {\n`;
        file += `\t\t\ttable.increments('id')\n\n`;

        schema.props.forEach(prop => {
            file += this.CompileProp(prop);
        })

        file += `\n\t\t\ttable.integer('created_by')\n`;
        file += `\t\t\ttable.integer('deleted_by')\n`;

        file += `\n\t\t\ttable.timestamp('deleted_at', { useTz: true })\n`;
        file += `\t\t\ttable.timestamp('created_at', { useTz: true })\n`;
        file += `\t\t\ttable.timestamp('updated_at', { useTz: true })\n`;
        file += `\t\t})\n`;
        file += `\t}\n\n`;

        file += `\tpublic async down () {\n`;
        file += `\t\tthis.schema.dropTable(this.tableName)\n`;
        file += `\t}\n`;
        file += `}`;

        return file;
    }

    static Compile(schemas: $.Node[], out_path: string) {
        Console.info('MigrationCompiler', '@start')
        let migrations = schemas.map(schema => ({
            name: Plural(schema.name),
            file: this.CompileSchema(schema)
        }));
        
        Console.info('MigrationCompiler', `Saving migration files to ${Console.colored(out_path,'green')}`)
        migrations.forEach(migration => {
            let name = migration.name + '.ts';
            let file_path = path.join(out_path,name);
            fs.writeFileSync(file_path, migration.file);
        })
    }

}