import { Exception } from "@adonisjs/core/build/standalone";
import { Status } from "./Common/Status";

export class NodeException extends Exception {

    static code = 'E_NODE'

    static NotFound(alias: string, id: number) {
        return new this(`${alias} não encontrado(a): ${id}`, Status.BADREQUEST, this.code)
    }

}

export class LinkException extends Exception {

    static code = 'E_LINK'

    static InvalidInheritanceLink(alias: string, field: string) {
        return new this(`${alias}: '${field}' não é um link de herança`, Status.INTERNAL_SERVER, this.code)
    }

    static InvalidCompositionLink(alias: string, field: string) {
        return new this(`${alias}: '${field}' não é um link de composição`, Status.INTERNAL_SERVER, this.code)
    }

}

export function DatabaseException(e: any) {
    console.error(e);
    let code = 'E_DATABASE';
    if (e.code === '22P02')
        return new Exception(`Não é possível pesquisar parâmetros numéricos com strings.`, Status.INTERNAL_SERVER, code)
    else if (e.code === '22007')
        return new Exception(`Formato de data inválido.`, Status.INTERNAL_SERVER, code)
    else
        return new Exception(`Erro desconhecido.`, Status.INTERNAL_SERVER, code)
}