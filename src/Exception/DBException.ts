import { Exception } from '@adonisjs/core/build/standalone'
import { Status } from '.'

class DBException extends Exception {

    static code = 'E_DB_EXCEPTION'

    constructor (e: any) {
        console.error(e);
        if (e.code === '22P02')
            super(`Não é possível pesquisar parâmetros numéricos com strings.`, Status.INTERNAL_SERVER, DBException.code)
        else if (e.code === '22007')
            super(`Formato de data inválido.`, Status.INTERNAL_SERVER, DBException.code)
        else
            super(`Erro desconhecido.`, Status.INTERNAL_SERVER, DBException.code)
    }

}

export default (e: any) => {return new DBException(e);}