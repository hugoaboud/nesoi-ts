import { Exception } from '@adonisjs/core/build/standalone'
import { Status } from '.'

export default class PaginationException extends Exception {
    static code = 'E_PAGINATION_EXCEPTION'
    static InvalidPage() {
		return new this('Página deve ser maior do que 0.', Status.BADREQUEST, this.code)
	}
    static InalidPerPage() {
		return new this('Resultados por página deve ser maior do que 0.', Status.BADREQUEST, this.code)
	}
    static InvalidOrderByParam(param: string) {
        return new this(`Parâmetro de ordenação inválido: ${param}`, Status.BADREQUEST, this.code)
    }	
    static CantOrderByDynamicParam(param: string) {
        return new this(`Não é possível ordenar a paginação a partir de um parâmetro dinâmico: ${param}`, Status.BADREQUEST, this.code)
    }	
}
