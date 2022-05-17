import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Client from './Client';
import { TNode, NodeEntity } from './Node';
import Route from '@ioc:Adonis/Core/Route'
import Node from './Node';

type TCRUDMethod = 'read' | 'index' | 'create' | 'update' | 'delete'

export default abstract class Controller {

    static route: string
    static node: TNode
    
    static read_route = true
    static index_route = true
    static create_route = true
    static update_route = true
    static delete_route = true

    static parent: any

    private setup(ctx: HttpContextContract): Node<any,any> {
        let client = new Client(ctx);
        return new (this.constructor as typeof Controller).node(client) as any;
    }

    async read(ctx: HttpContextContract) {
        let node = this.setup(ctx);
        let obj = await node.ReadOne(ctx.params.id);
        if (this.format) return this.format(node, [obj]);
        return obj;
    }

    async index(ctx: HttpContextContract) {
        let node = this.setup(ctx);
        let objs = await node.ReadAll();
        if (this.format) return this.format(node, objs);
        return objs;
    }

    async create(ctx: HttpContextContract) {
        let node = this.setup(ctx);
        let objs = await node.Create(ctx.request.body());
        if (this.format) return this.format(node, objs);
        return objs;
    }

    async update(ctx: HttpContextContract) {
        let node = this.setup(ctx);
        let obj = await node.Update(ctx.params.id, ctx.request.body());
        if (this.format) return this.format(node, [obj]);
        return obj;
    }

    async delete(ctx: HttpContextContract) {
        let node = this.setup(ctx);
        await node.Delete(ctx.params.id);
    }

    async format?(node: Node<any,any>, entities: NodeEntity<typeof node.constructor.prototype.builder>[]): Promise<NodeEntity<any>[]>

    private static Methods(method: TCRUDMethod): string|((ctx:HttpContextContract)=>any) {

        if (!this.parent) {
            let controller = this.prototype.constructor.name;
            return controller + "." + method
        }

        return async (ctx: HttpContextContract) => {
            const p = await import( 'App/Controllers/Http/'+this.parent.prototype.constructor.name );
            return new (p[this.prototype.constructor.name])()[method](ctx)
        }

    }

    private static Name(method: TCRUDMethod) {
        return '[' + method + '] ' + (this.node as any as typeof Node).alias;
    }

    private static isEnabled(method: TCRUDMethod): boolean {

        if (method !== 'read' && method !== 'index') {
            return (this.node as any as typeof Node).input != undefined;
        }
        return (this as any)[method+'_route'];
        
    }

    static routes() {
        if (this.isEnabled('read'))   Route.get   (`/${this.route}/:id`, this.Methods('read')).as(this.Name('read'))
        if (this.isEnabled('index'))  Route.get   (`/${this.route}`,     this.Methods('index')).as(this.Name('index'))
        if (this.isEnabled('create')) Route.post  (`/${this.route}`,     this.Methods('create')).as(this.Name('create'))
        if (this.isEnabled('update')) Route.patch (`/${this.route}/:id`, this.Methods('update')).as(this.Name('update'))
        if (this.isEnabled('delete')) Route.delete(`/${this.route}/:id`, this.Methods('delete')).as(this.Name('delete'))
    }

}