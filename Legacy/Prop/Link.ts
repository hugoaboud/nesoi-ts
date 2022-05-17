import { LinkException } from "../Exceptions";
import Node, { TNode } from "../Node";
import { Prop } from ".";

export default class Link implements Prop {

    source: 'model'
    async = true

    constructor(
        public fn: (data: Record<string,any>, key: string, node: Node<any,any>) => any,
        public field: string,
        public target_type: TNode
    ) {
        this.source = 'model';
    }

    // Inheritance Links

    static Parent(ParentNode: TNode, field: string): Prop {
        return new Link(async (model: Record<string,any>, key: string, node: Node<any,any>) => {
            
            if (!model[field]) return undefined;
            if (!(key in node.expand)) return {
                _t: ParentNode.name,
                id: model[field]
            }

            if (!this.isParentField((node.constructor as TNode), field))
                throw LinkException.InvalidInheritanceLink((ParentNode as any).alias, field)

            let parent_handler = new ParentNode(node.client, node.trx, node.expand[key])
            return parent_handler.ReadOne(model[field])

        }, field, ParentNode)
    }
    
    static Children(ChildNode: TNode, field: string): Prop {
        return new Link(async (model: Record<string,any>, key: string, node: Node<any,any>) => {
            
            if (!(key in node.expand)) return undefined;

            if (!this.isParentField(ChildNode, field))
                throw LinkException.InvalidInheritanceLink((ChildNode as any).alias, field)
            
            let child_handler = new ChildNode(node.client, node.trx, node.expand[key]);
            return child_handler.ReadKeyValue(field, model.id);

        }, field, ChildNode)
    }

    // Composition Links

    static HasOne(ChildNode: TNode, field: string): Prop {
        return new Link(async (model: Record<string,any>, key: string, node: Node<any,any>) => {
            
            if (!model[field]) return undefined;
            if (!(key in node.expand)) return {
                _t: ChildNode.name,
                id: model[field]
            }

            if (this.isParentField((node.constructor as TNode), field))
                throw LinkException.InvalidCompositionLink((ChildNode as any).alias, field)

            let child_handler = new ChildNode(node.client, node.trx, node.expand[key])
            return child_handler.ReadOne(model[field]);

        }, field, ChildNode)
    }

    static HasMany(ChildNode: TNode, field: string): Prop {
        return new Link(async (model: Record<string,any>, key: string, node: Node<any,any>) => {
            
            if (!model[field]) return undefined;
            if (!(key in node.expand)) return {
                _t: ChildNode.name+'[]',
                id: model[field]
            }
            
            if (this.isParentField((node.constructor as TNode), field))
                throw LinkException.InvalidCompositionLink((ChildNode as any).alias, field)

            let child_handler = new ChildNode(node.client, node.trx, node.expand[key])
            return Promise.all(model[field].map((id:number) => 
                child_handler.ReadOne(id)
            ));

        }, field, ChildNode)
    }

    private static isParentField(Node: TNode, field: string) {
        let parents = (Node as any).model['$parents'] as Set<string>;
        return (parents && parents.has(field))
    }

}