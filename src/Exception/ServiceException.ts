import { Exception } from '@adonisjs/core/build/standalone'
import { AxiosError } from 'axios'
import Console from '../Util/Console'
import { Status } from '.'

export default class ServiceException extends Exception {

    static code = 'E_SERVICE_EXCEPTION'

    static LoginFailed(service: string, e: any) {
        return new this(`<${service}> Falha de Login: ${e}`, Status.UNAUTHORIZED, this.code)
    }

    static AuthFailed(service: string, e: any) {
        Console.error(e);
        return new this(`<${service}> Falha de Autorização`, Status.UNAUTHORIZED, this.code)
    }

    static RefreshFailed(service: string) {
        return new this(`<${service}> Falha ao Atualizar o Token`, Status.UNAUTHORIZED, this.code)
    }

    static InvalidAuthHeaders(service: string) {
        return new this(`<${service}> Header de autenticação inválido`, Status.UNAUTHORIZED, this.code)
    }

    static InvalidEndpoint(service: string, endpoint: string) {
        return new this(`<${service}> Endpoint não cadastrado: ${endpoint}`, Status.INTERNAL_SERVER, this.code)
    }

    static MissingEndpointURLParam(service: string, endpoint: string, param: string) {
        return new this(`<${service}> ${endpoint}, parâmetro de URL não definido: ${param}`, Status.INTERNAL_SERVER, this.code)
    }

    static RequestError(service: string, error: AxiosError) {
        Console.debug(service, error.response!);
        let exception = (error.response?.data as any).exception;
        if (!exception) exception = error.code + ' ' + (error as any).hostname;
        return new this(`<${service}>: ${exception}`, error.response?.status, this.code)
    }

}
