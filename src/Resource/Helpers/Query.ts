import { Exception as BaseException } from '@adonisjs/core/build/standalone';
import ResourceMachine from "../Machines/ResourceMachine";
import { Status } from '../../Service';
import { GraphLink } from '../Props/Graph';
import { Client } from '../../Auth/Client';
import { ReverseEnum } from '../../Util/Enum';
import BaseModel from '../Model';

type Operator = 'like'|'='|'>='|'<='|'in'
type Value = string|number|string[]|number[]
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
    value: Value
}

type Rule = Param[]

export class QueryBuilder<T> {

    protected rules: Rule[] = []
    protected sort?: Sort
    protected out?: Record<string,string>
    
    constructor(
        protected client: Client,
        protected res: ResourceMachine<any,any>,
        protected service = false
    ) {}
    
    rule(rule_params: string | string[], op: Operator, value: Value): QueryBuilder<T> {
        
        if (!Array.isArray(rule_params)) rule_params = [rule_params];

        const rule = rule_params.map(param =>
            this.parseParam(this.res, param, op, value)
        );
        this.rules.push(rule);

        return this;
    }

    protected addRule(rule: Rule) {
        this.rules.push(rule);
        return this;
    }
    
    sortedBy(param: string, dir: 'asc'|'desc' = 'asc'): QueryBuilder<T> {
        this.sort = {
            param, dir
        };
        return this;
    }
    
    expectFormat(format: Record<string,any>): QueryBuilder<T> {
        this.out = format;
        return this;
    }

    private parseParam(
        res: ResourceMachine<any,any>,
        param_path: string,
        op: Operator,
        value: Value,
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
                    const child_path = (path || []).concat([child_res]);
                    return this.parseParam(child_res, child_param, op, value, child_path);
                }
                // TODO: check types, enum, date, etc
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
    ): QueryBuilder<any> {
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

    public async all(): Promise<T[]> {
        return (this.res as any).runQuery(this.client, this);
    }

    public async first(): Promise<T> {
        const all = await this.all()
        return all[0];
    }


}

export class Query {

    public rules!: Rule[]
    public sort?: Sort
    public out?: Record<string,string>
    public client!: Client
    public res!: ResourceMachine<any,any>
    public service!: boolean

    static async run(client: Client, builder: QueryBuilder<any>): Promise<BaseModel[]> {
        
        let q = builder as any as Query;
        let model = q.res.$.Model as (typeof BaseModel);
        let query = model.query();

        if (client.trx) query.useTransaction(client.trx);
        model.filterByTenant(client, query)

        for (let r in q.rules) {
            let rule = q.rules[r];
            let qrule = [] as [string,string,any][];
            for (let p in rule) {
                let param = rule[p];
                await this.walk(client, q.res, param);
                // TODO: array columns
                if (param.op === 'like') param.value = '%'+param.value+'%';
                qrule.push([param.param, param.op, param.value]);
            }

            query.where(query => {
                qrule.forEach(rule => 
                    query.orWhere(rule[0], rule[1], rule[2])
                )
            });
        }

        query = query.whereNot('state', 'deleted');
        return query as any;
    }

    private static async walk(client: Client, parent: ResourceMachine<any,any>, param: Param): Promise<void> {
        
        if (!param.path.length) return;

        const res = param.path.shift()!;
        const builder = (res.query(client) as any).addRule([param]) as QueryBuilder<any>;
        const rows = await this.run(client, builder);

        let fkey_child = res.name('lower_snake') + '_id';

        // Parent stores reference to child id
        if (parent.$.Model.$hasColumn(fkey_child)) {
            param.param = fkey_child;
            param.value = rows.map(row => row.id);
        }
        // Child stores reference to parent id
        else {
            let fkey_parent = parent.name('lower_snake') + '_id';
            param.param = 'id';
            param.value = rows.map(row => (row as any)[fkey_parent]);
        }
        param.op = 'in';
    }

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

        static Unknown(e: Error) {
            console.log(e);
            return new this(`Erro desconhecido`, Status.INTERNAL_SERVER, this.code)
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