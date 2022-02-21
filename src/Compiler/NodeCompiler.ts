import * as fs from 'fs';
import path from 'path';
import Console from '../Common/Console';
import { Camelize } from '../Common/String';
import { $ } from './Schema';

export default class NodeCompiler {
    
    static CompileImports(schema: $.Node) {

        let model_name = Camelize(schema.name) + 'Model'

        let buf = `import ${model_name} from './${model_name}'\n`;
        buf += `import Node, { NodeEntity } from 'adonis-graph-db/lib/Node'\n`;
        buf += `import { Prop } from 'adonis-graph-db/lib/Prop'\n`;

        buf += '\n';
        return buf;
    }

    static CompileDeclaration(schema: $.Node) {
        let node_name = Camelize(schema.name)

        let buf = `export interface ${node_name} extends NodeEntity<typeof ${node_name}Node.builder> {}\n`;
        buf += `export default class ${node_name}Node extends Node<any, ${node_name}> {\n`;

        buf += '\n';
        return buf;
    }

    static CompileProp(prop: $.Prop) {
        if (prop.opts.scope === 'private') return null;
        let buf = `\t\t${prop.name}: Prop.Field('${prop.name}')`;
        return buf;
    }

    static CompileBuilder(schema: $.Node) {
        let buf = `\tstatic builder = {\n`;
        let props = schema.props.map(prop => this.CompileProp(prop)).filter(p => p)
        buf += props.join(',\n')+'\n';
        buf += '\t}\n\n';        
        return buf;
    }

    static CompileExpand(_schema: $.Node) {
        let buf = `\tstatic expand = {\n`;
        buf += '\t}\n\n';
        return buf;
    }

    static CompileDoCreate(_schema: $.Node) {
        let buf = `\tdoCreate() { return null as any; }\n`;
        buf += '\n';
        return buf;
    }

    static CompileDoUpdate(_schema: $.Node) {
        let buf = `\tdoUpdate() { return null as any; }\n`;
        buf += '\n';
        return buf;
    }

    static CompileSchema(schema: $.Node) {
        Console.info('NodeCompiler', `Compiling ${Console.colored(schema.name,'cyan')}`)

        let model_name = Camelize(schema.name)+'Model'

        let buf = this.CompileImports(schema);
        buf += this.CompileDeclaration(schema);

        buf += `\tstatic alias = '${schema.alias}'\n`
        buf += `\tstatic model = ${model_name}\n\n`

        buf += this.CompileBuilder(schema);
        buf += this.CompileExpand(schema);
        buf += this.CompileDoCreate(schema);
        buf += this.CompileDoUpdate(schema);

        buf += '}'
        return buf;
    }

    static Save(buf: string, out_path: string, name: string) {
        name = Camelize(name) + 'Node.ts'
        let file_path = path.join(out_path,name);
        Console.info('NodeCompiler', `Saving ${Console.colored(file_path,'green')}`)
        fs.writeFileSync(file_path, buf);   
    }

    static Compile(schema: $.Node, out_path: string) {
        let buf = this.CompileSchema(schema);
        this.Save(buf, out_path, schema.name);
    }

}