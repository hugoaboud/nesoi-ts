import { Exception as BaseException } from '@adonisjs/core/build/standalone';
import ResourceMachine from "../ResourceMachine";
import { Status } from '../../Service';
import { GraphLink } from '../Graph';
import { Client } from '../../Auth/Client';
import { ReverseEnum } from '../../Util/Enum';

type Operator = 'like'|'='|'>='|'<='|'in'
enum OpRansackToRule {
    cont = 'like',
    eq = '=',
    gteq = '>=',
    lteq = '<=',
    in = 'in'
}
const OpRuleToRansack = ReverseEnum(OpRansackToRule);

interface Sort {
    param: string,
    dir: 'asc' | 'desc'
}

interface Param {
    path: ResourceMachine<any,any>[]
    param: string,
    op: Operator,
    value: string|number
}

type Rule = Param[]

export class QueryBuilder {

    protected rules: Rule[] = []
    protected sort?: Sort
    protected out?: Record<string,string>
    
    constructor(
        protected client: Client,
        protected res: ResourceMachine<any,any>,
        protected service = false
    ) {}
    
    rule(rule_params: string | string[], op: Operator, value: string|number): QueryBuilder {
        
        if (!Array.isArray(rule_params)) rule_params = [rule_params];

        const rule = rule_params.map(param =>
            this.parseParam(this.res, param, op, value)
        );
        this.rules.push(rule);

        return this;
    }
    
    sortedBy(param: string, dir: 'asc'|'desc' = 'asc'): QueryBuilder {
        this.sort = {
            param, dir
        };
        return this;
    }
    
    expectFormat(format: Record<string,any>): QueryBuilder {
        this.out = format;
        return this;
    }

    private parseParam(
        res: ResourceMachine<any,any>,
        param_path: string,
        op: Operator,
        value: string|number,
        path?: ResourceMachine<any,any>[]
    ): Param {
        if (this.service) {
            return {
                path: [],
                param: param_path,
                op,
                value
            }
        }
        let param = param_path;
        while (param) {
            const prop = res.$.Output[param];
            if (prop) {
                if (prop instanceof GraphLink) {
                    const child_res = prop.resource;
                    const child_param = param_path.slice(param.length+1);
                    if (!child_param.length) throw Exception.InvalidParam(param_path);
                    const child_path = [child_res].concat(path || []);
                    return this.parseParam(child_res, child_param, op, value, child_path);
                }
                // check enum, date, etc
                return { 
                    path: path || [],
                    param: param,
                    op,
                    value
                };
            }
            let [_,less] = param.match(/(.*)_/) || []
            param = less;
        }
        throw Exception.InvalidParam(param_path);
    }

    /** From/To ransack syntax */

    static fromRansack(
        client: Client,
        res: ResourceMachine<any,any>,
        q: Record<string,any>
    ): QueryBuilder {
        if (!q) throw Exception.QNotFound();
        const query = new QueryBuilder(client, res);
        for (let rule in q) {
            if (rule === 's') continue;
            const [_,params,op] = rule.match(/(.*)_(.*)/) || [];
            if (!params) throw Exception.MalformedQuery();
            if (!OpRansackToRule[op as never]) throw Exception.UnknownOperator(op);
            query.rule(
                params.split('_or_'),
                OpRansackToRule[op as never],
                q[rule]
            );
        }
        return query;
    }

    protected toRansack(): Record<string,any> {
        const q: Record<string,any> = {};

        this.rules.forEach(rule => {
            const params = rule.map(p => p.param).join('_or_');
            const op = OpRuleToRansack[rule[0].op as never];
            q[params + '_' + op] = rule[0].value;
        })

        return q;
    }

    public async run() {
        return (this.res as any).runQuery(this.client, this);
    }


}

// export function Sort(rule?: string): Sort|undefined {
//     if (!rule) return undefined;
//     let split = rule.split(' ');
//     if (split[1] !== 'asc' && split[1] !== 'desc') throw Exception.InvalidSortDirection(split[1]);
//     return {
//         param: split[0],
//         dir: split[1]
//     }
// }

// export function FilterQuery(param: string, op: 'like' | '=' | '>=' | '<=' | 'in', value: any): IFilterQuery {
//     return {
//         rules: [{
//             op: op as any,
//             param,
//             value
//         }]
//     }
// }

// export function FilterRawQuery(param: string, value: string) {
//     return {
//         rules: [{
//             op: Operator.eq,
//             param,
//             value
//         }],
//         raw: true
//     }
// }



export class Filter {


    // /**
    //  * Parses rules for a given Handler
    //  * This transforms BaseRules into ServiceRules to be executed later.
    //  */
    //  static parseRules(handler: Handler<any,any>, queries: IFilterQuery[]): IFilterQuery[] {
        
    //     let builder = {
    //         id: 'id',
    //         ...handler.group_keys?.reduce((a:any,x) => {a[x] = x; return a;}, {}),
    //         ...new handler.builder(),
    //     } as HandlerBuilder

    //     queries.map(query => {
    //         query.rules = query.rules.map(rule => {
    //             let param = rule.param;
                
    //             // Format incoming dates
    //             if (param.endsWith('date'))
    //                 rule.value = NormalizeISODate(rule.value as string, 'start')

    //             // If param matches exactly a raw param, it's a BaseRule
    //             if (typeof builder[param] === 'string') return {
    //                 ...rule,
    //                 param: builder[param]
    //             };
                
    //             // If param matches exactly a enum param, check value before returning a BaseRule
    //             let enum_param = (builder[param] as IBuilderParam);
    //             if (enum_param?.t_enum) {
    //                 if (!enum_param.t_enum.includes(rule.value))
    //                     throw Exception.InvalidEnumValue(rule.value, param);
    //                 return {
    //                     ...rule,
    //                     param: builder[param]
    //                 };
    //             }

                
    //             // If param is a _date, try looking for a matching _datetime raw param
    //             if (param.endsWith('date')) {
    //                 if (typeof builder[param+'time'] === 'string') return {
    //                     ...rule,
    //                     param: builder[param+'time']
    //                 };
    //             }
    //             // If param is a _datetime, try looking for a matching _date raw param
    //             else if (param.endsWith('datetime')) {
    //                 if (typeof builder[param.slice(0,-4)] === 'string') return {
    //                     ...rule,
    //                     param: builder[param.slice(0,-4)],
    //                     value: NormalizeISODate(rule.value as string, 'start')
    //                 };
    //             }

    //             // Find root param
    //             let terms = param.split('_');
    //             let root:string|null = null;
    //             for (let t in terms) {
    //                 if (!root) root = terms[t];
    //                 else root += '_'+terms[t];
    //                 if (builder[root]) break;
    //             }
    //             if (root && !builder[root]) root = null;

    //             // No root found = invalid parameter
    //             if (!root) {
    //                 if (typeof builder[param] === 'function') Exception.InvalidDynamicParam(param);
    //                 throw Exception.InvalidParam(param);
    //             }
                
    //             // Try to parse a ServiceRule
    //             let service_param = (builder[root] as IBuilderParam);
    //             if (service_param.service) {
    //                 return {
    //                     param: service_param.params[0],
    //                     service: service_param.service,
    //                     endpoint: service_param.endpoint,
    //                     query: param.slice(root.length+1),
    //                     op: rule.op,
    //                     value: rule.value
    //                 } as IServiceRule;
    //             }                
    //         }) as any;
    //     })
    
    //     return queries;

    // }

    // /**
    //  * Runs service rules and replace them on the filter queries
    //  */
    // static async runServiceRules(client: Client, queries: IFilterQuery[]): Promise<IFilterQuery[]> {

    //     return Promise.all(queries.map(async query => {

    //         let rules = await Promise.all(
    //             query.rules.map(async r =>{ 
    //                 let rule = r as IServiceRule
    //                 if (!rule.service) return rule;
    //                 let results = await client.filter(rule.service, rule.endpoint, {queries: [FilterQuery(rule.query, rule.op, rule.value)]});
    //                 if (!results.length) return null;
                    
    //                 return {
    //                     param: rule.param,
    //                     op: Operator.in,
    //                     value: results.map(r => r.id)
    //                 }
    //             })
    //         )

    //         return {
    //             rules: rules.filter(r => r) as Rule[]
    //         }
    //     }));

    // }

}

class Exception extends BaseException {

        static code = 'E_QUERY_EXCEPTION'
    
        static QNotFound() {
            return new this(`Parâmetro 'q' não encontrado no corpo da requisição`, Status.BADREQUEST, this.code)
        }
    
        static MalformedQuery() {
            return new this(`Query mal formatada`, Status.BADREQUEST, this.code)
        }
    
        // static InOperatorWithoutArray(param: string) {
        //     return new this(`Operador 'in' deve receber um array como valor. Parâmetro: ${param}`, Status.BADREQUEST, this.code)
        // }
    
        static UnknownOperator(method: string) {
            return new this(`Operador desconhecido: ${method}`, Status.BADREQUEST, this.code)
        }
    
        static InvalidParam(param: string) {
            return new this(`Parâmetro inválido: ${param}`, Status.BADREQUEST, this.code)
        }
    
        // static InvalidDynamicParam(param: string) {
        //     return new this(`Parâmetro dinâmico não pode ser utilizado como filtro: ${param}`, Status.BADREQUEST, this.code)
        // }
    
        // static InvalidEnumValue(value: any, param: string) {
        //     return new this(`Valor '${value}' inválido para o parâmetro: ${param}`, Status.BADREQUEST, this.code)
        // }
    
        // static InvalidListOperator(op: any, param: string) {
        //     return new this(`Operador '${op}' inválido para o parâmetro: ${param}`, Status.BADREQUEST, this.code)
        // }
    
        // static ColumnNotFound(column: string) {
        //     return new this(`Coluna não encontrada: ${column}`, Status.BADREQUEST, this.code)
        // }
    
        // static LucidError(e: any) {
    
        //     if (e.routine === 'errorMissingColumn') {
        //         let column = /column "(.*)" does not exist/.exec(e.message);
        //         this.ColumnNotFound(column?column[1]:'');
        //     }
    
        //     return new this(`Lucid Error: ${e}`, Status.BADREQUEST, this.code)
        // }
    
        // static NotImplemented() {
        //     return new this(`Não implementado.`, Status.INTERNAL_SERVER, this.code)
        // }
    
        // static InvalidSortParam(param: string) {
        //     return new this(`Parâmetro de ordenação inválido: ${param}`, Status.BADREQUEST, this.code)
        // }
    
        // static InvalidSortDirection(dir: string) {
        //     return new this(`Direção de ordenação inválida: ${dir}`, Status.BADREQUEST, this.code)
        // }
    
    }