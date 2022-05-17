import { Status } from "../Common/Status";
import { Camelize } from "../Common/String";
import { $ } from "./Schema";

import i18n from "../i18n";
const Strings = i18n.Schema;

export namespace Rules {

    export function GreaterThan(val:number) {
        return (prop: $.Prop.I) => {
            let exception_name = Camelize(prop.name)+'NotGreaterThan'+(val.toString().replace('.','_'));
            return {
                code: `if (input.${prop.name} <= ${val}) throw Exception.${exception_name}(input.${prop.name})`,
                exception: {
                    name: exception_name,
                    args: [{name: 'val', type: 'number'}],
                    status: Status.BADREQUEST,
                    msg: `${prop.alias} (\${val}) ${Strings.RuleExceptions.greaterThan} ${val}`
                }
            }
        }
    }
    
    export function GreaterThanOrEqualTo(val:number) {
        return (prop: $.Prop.I) => {
            let exception_name = Camelize(prop.name)+'NotGreaterThanOrEqualTo'+(val.toString().replace('.','_'));
            return {
                code: `if (input.${prop.name} < ${val}) throw Exception.${exception_name}(input.${prop.name})`,
                exception: {
                    name: exception_name,
                    args: [{name: 'val', type: 'number'}],
                    status: Status.BADREQUEST,
                    msg: `${prop.alias} (\${val}) ${Strings.RuleExceptions.greaterThanOrEqualTo} ${val}`
                }
            }
        }
    }

    export function LessThan(val:number) {
        return (prop: $.Prop.I) => {
            let exception_name = Camelize(prop.name)+'NotLessThan'+(val.toString().replace('.','_'));
            return {
                code: `if (input.${prop.name} >= ${val}) throw Exception.${exception_name}(input.${prop.name})`,
                exception: {
                    name: exception_name,
                    args: [{name: 'val', type: 'number'}],
                    status: Status.BADREQUEST,
                    msg: `${prop.alias} (\${val}) ${Strings.RuleExceptions.greaterThan} ${val}`
                }
            }
        }
    }
    
    export function LessThanOrEqualTo(val:number) {
        return (prop: $.Prop.I) => {
            let exception_name = Camelize(prop.name)+'NotLessThanOrEqualTo'+(val.toString().replace('.','_'));
            return {
                code: `if (input.${prop.name} > ${val}) throw Exception.${exception_name}(input.${prop.name})`,
                exception: {
                    name: exception_name,
                    args: [{name: 'val', type: 'number'}],
                    status: Status.BADREQUEST,
                    msg: `${prop.alias} (\${val}) ${Strings.RuleExceptions.greaterThanOrEqualTo} ${val}`
                }
            }
        }
    }

}