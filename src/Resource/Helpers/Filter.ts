import { Exception as BaseException } from '@adonisjs/core/build/standalone';
import ResourceMachine from "../ResourceMachine";
import { Status } from '../../Service';
import { GraphLink } from '../Graph';
import { Client } from '../../Auth/Client';

type Operator = 'like'|'='|'>='|'<='|'in'
enum OperatorQ {
    cont = 'like',
    eq = '=',
    gteq = '>=',
    lteq = '<=',
    in = 'in'
}

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

export class Query {

    protected rules: Rule[] = []
    protected sort?: Sort
    protected out?: Record<string,string>
    
    constructor(
        protected client: Client,
        protected res: ResourceMachine<any,any>,
        q?: Record<string,any>
    ) {
        if (q) this.fromQ(q);
    }
    
    rule(rule_params: string | string[], op: Operator, value: string|number): Query {
        
        if (!rule_params) Exception.MalformedQuery();
        if (!Array.isArray(rule_params)) rule_params = [rule_params];

        const rule = rule_params.map(param =>
            this.parseParam(this.res, param, op, value)
        );
        this.rules.push(rule);

        return this;
    }
    
    sortedBy(param: string, dir: 'asc'|'desc' = 'asc'): Query {
        this.sort = {
            param, dir
        };
        return this;
    }
    
    expectFormat(format: Record<string,any>): Query {
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
        let param = param_path;
        while (param) {
            const prop = (res as any)[param];
            if (prop) {
                if (prop instanceof GraphLink) {
                    const child_res = prop.resource;
                    const child_param = param.slice(param.length+1);
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

    private fromQ(q: Record<string,string>): void {
        for (let q_rule in q) {
            if (q_rule === 's') continue;
            const [_,q_params,op] = q_rule.match(/(.*)_(.*)/) || [];
            if (!OperatorQ[op as never]) Exception.UnknownOperator(op);
            this.rule(
                q_params.split('_or_'),
                OperatorQ[op as never],
                q[q_rule]
            );
        }
    }

    public toQ(): Record<string,any> {
        const q: Record<string,any> = {};

        this.rules.forEach(rule => {

            const params = rule.map(p => p.param).join('_or_');
            const op = OperatorQ[rule[0].op as never];

            q[params + '_' + op] = rule[0].value;
        })

        return q;
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

        static code = 'E_FILTER_EXCEPTION'
    
        // static QNotFound() {
        //     throw new this(`Parâmetro 'q' não encontrado no corpo da requisição`, Status.BADREQUEST, this.code)
        // }
    
        static MalformedQuery() {
            throw new this(`Query mal formatada`, Status.BADREQUEST, this.code)
        }
    
        // static InOperatorWithoutArray(param: string) {
        //     throw new this(`Operador 'in' deve receber um array como valor. Parâmetro: ${param}`, Status.BADREQUEST, this.code)
        // }
    
        static UnknownOperator(method: string) {
            throw new this(`Operador desconhecido: ${method}`, Status.BADREQUEST, this.code)
        }
    
        static InvalidParam(param: string) {
            throw new this(`Parâmetro inválido: ${param}`, Status.BADREQUEST, this.code)
        }
    
        // static InvalidDynamicParam(param: string) {
        //     throw new this(`Parâmetro dinâmico não pode ser utilizado como filtro: ${param}`, Status.BADREQUEST, this.code)
        // }
    
        // static InvalidEnumValue(value: any, param: string) {
        //     throw new this(`Valor '${value}' inválido para o parâmetro: ${param}`, Status.BADREQUEST, this.code)
        // }
    
        // static InvalidListOperator(op: any, param: string) {
        //     throw new this(`Operador '${op}' inválido para o parâmetro: ${param}`, Status.BADREQUEST, this.code)
        // }
    
        // static ColumnNotFound(column: string) {
        //     throw new this(`Coluna não encontrada: ${column}`, Status.BADREQUEST, this.code)
        // }
    
        // static LucidError(e: any) {
    
        //     if (e.routine === 'errorMissingColumn') {
        //         let column = /column "(.*)" does not exist/.exec(e.message);
        //         this.ColumnNotFound(column?column[1]:'');
        //     }
    
        //     throw new this(`Lucid Error: ${e}`, Status.BADREQUEST, this.code)
        // }
    
        // static NotImplemented() {
        //     return new this(`Não implementado.`, Status.INTERNAL_SERVER, this.code)
        // }
    
        // static InvalidSortParam(param: string) {
        //     throw new this(`Parâmetro de ordenação inválido: ${param}`, Status.BADREQUEST, this.code)
        // }
    
        // static InvalidSortDirection(dir: string) {
        //     throw new this(`Direção de ordenação inválida: ${dir}`, Status.BADREQUEST, this.code)
        // }
    
    }