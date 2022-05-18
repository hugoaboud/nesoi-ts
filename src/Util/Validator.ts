import { Schema } from "..";
import { Exception as BaseException } from '@adonisjs/core/build/standalone';
import { Status } from "./Service";
import { GraphPropSchema } from "../Graph";

export function isEmpty(val: any): boolean {
    return (val == null || val.length == 0)
}

export class ResourceSchemaValidator {

    static validate($: Schema) {

        if (this.hasMonetaryProp($.Output)) {
            if (!$.Model.$hasColumn('coin'))
                throw Exception.NoCoinOnMonetaryTable();
        }

    }

    private static hasMonetaryProp(output: Schema['Output']) {
        for (let key in output) {
            const prop = output[key];
            if (prop instanceof GraphPropSchema) continue;
            if (!prop.fn) {
                if (this.hasMonetaryProp(prop as Schema['Output']))
                    return true;
                continue;
            }
            if (prop.type === 'money') return true;
        }
        return false;
    }

}

class Exception extends BaseException {

    static code = 'E_RESOURCE_SCHEMA'

    static NoCoinOnMonetaryTable() {
        return new this('Um recurso com propriedade(s) monetária(s) deve possuir uma coluna `coin` no modelo', Status.INTERNAL_SERVER, this.code);
    }

}