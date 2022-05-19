import { Resource, Schema } from "../Resource";
import { Exception as BaseException } from '@adonisjs/core/build/standalone';
import { Status } from "./Service";
import { GraphLinkSchema } from "../Resource/Graph";
import { PropSchema } from "../Resource/Output";
import BaseModel from "../Resource/Model";

export function isEmpty(val: any): boolean {
    return (val == null || val.length == 0)
}

export class ResourceSchemaValidator {

    static validate(resource: Resource<any,any>, $: Schema) {

        if (this.hasMonetaryProp($.Output))
            this.checkCoinColumn($.Model);

        const links = this.getGraphLinks($.Output);
        links.forEach(link => {
            this.checkGraphLinkFKey(resource, $.Model, link);
        })

    }

    private static hasMonetaryProp(output: Schema['Output']) {
        for (let key in output) {
            const prop = output[key];
            if (prop instanceof GraphLinkSchema) continue;
            if (!prop.fn) {
                if (this.hasMonetaryProp(prop as Schema['Output']))
                    return true;
                continue;
            }
            if (prop.type === 'money') return true;
        }
        return false;
    }

    private static getGraphLinks(output: Schema['Output']) {
        const links: GraphLinkSchema<any>[] = []

        for (let key in output) {
            const prop = output[key];
            if (prop instanceof GraphLinkSchema) {
                links.push(prop);
                continue;
            }
            if (!(prop instanceof PropSchema)) {
                links.push(...this.getGraphLinks(prop))
            }
        }

        return links;
    }

    private static checkCoinColumn(model: typeof BaseModel) {
        if (!model.$hasColumn('coin'))
                throw Exception.NoCoinOnMonetaryTable();
    }

    private static checkGraphLinkFKey<S extends Schema, R extends Resource<any,S>>(
        resource: R, model: typeof BaseModel,
        link: GraphLinkSchema<R>
    ) {
        if (link.many) {
            const fkey = resource.name(true) + '_id';
            if (!link.resource.$.Model.$hasColumn(fkey))
                throw Exception.NoFKeyForChildrenLink(fkey);
        }
        else {
            const fkey = link.resource.name(true) + '_id';
            if (!model.$hasColumn(fkey))
                throw Exception.NoFKeyForChildLink(fkey);
        }
    }

}

class Exception extends BaseException {

    static code = 'E_RESOURCE_SCHEMA'

    static NoCoinOnMonetaryTable() {
        return new this('Um recurso com propriedade(s) monetária(s) deve possuir uma coluna `coin` no modelo', Status.INTERNAL_SERVER, this.code);
    }

    static NoFKeyForChildLink(fkey: string) {
        return new this(`Um recurso com um link child deve possuir uma coluna '${fkey}' no modelo`, Status.INTERNAL_SERVER, this.code);
    }

    static NoFKeyForChildrenLink(fkey: string) {
        return new this(`O recurso filho de um link children deve possuir uma coluna '${fkey}' no modelo`, Status.INTERNAL_SERVER, this.code);
    }

}