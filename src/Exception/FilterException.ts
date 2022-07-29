import { Exception } from '@adonisjs/core/build/standalone'
import { Status } from '.'

export default class FilterException extends Exception {

    static code = 'E_FILTER_EXCEPTION'

    static QNotFound() {
        throw new this(`Parâmetro 'q' não encontrado no corpo da requisição`, Status.BADREQUEST, this.code)
    }

    static MalformedQuery() {
        throw new this(`Query mal formatada`, Status.BADREQUEST, this.code)
    }

    static InOperatorWithoutArray(param: string) {
        throw new this(`Operador 'in' deve receber um array como valor. Parâmetro: ${param}`, Status.BADREQUEST, this.code)
    }

    static UnknownMethod(method: string) {
        throw new this(`Método desconhecido: ${method}`, Status.BADREQUEST, this.code)
    }

    static InvalidParam(param: string) {
        throw new this(`Parâmetro inválido: ${param}`, Status.BADREQUEST, this.code)
    }

    static InvalidDynamicParam(param: string) {
        throw new this(`Parâmetro dinâmico não pode ser utilizado como filtro: ${param}`, Status.BADREQUEST, this.code)
    }

    static InvalidEnumValue(value: any, param: string) {
        throw new this(`Valor '${value}' inválido para o parâmetro: ${param}`, Status.BADREQUEST, this.code)
    }

    static InvalidListOperator(op: any, param: string) {
        throw new this(`Operador '${op}' inválido para o parâmetro: ${param}`, Status.BADREQUEST, this.code)
    }

    static ColumnNotFound(column: string) {
        throw new this(`Coluna não encontrada: ${column}`, Status.BADREQUEST, this.code)
    }

    static LucidError(e: any) {

        if (e.routine === 'errorMissingColumn') {
            let column = /column "(.*)" does not exist/.exec(e.message);
            this.ColumnNotFound(column?column[1]:'');
        }

        throw new this(`Lucid Error: ${e}`, Status.BADREQUEST, this.code)
    }

    static NotImplemented() {
        return new this(`Não implementado.`, Status.INTERNAL_SERVER, this.code)
    }

    static InvalidSortParam(param: string) {
        throw new this(`Parâmetro de ordenação inválido: ${param}`, Status.BADREQUEST, this.code)
    }

    static InvalidSortDirection(dir: string) {
        throw new this(`Direção de ordenação inválida: ${dir}`, Status.BADREQUEST, this.code)
    }

}
