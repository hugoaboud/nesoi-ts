import { Exception } from '@adonisjs/core/build/standalone'
import { Status } from '.'

export default class TestException extends Exception {

    static code = 'E_TEST_EXCEPTION'

    static POSTRouteFailed(hash: string) {
        return new this(`POST failed: ${hash}`, Status.BADREQUEST, this.code)
    }
    
    static POSTRouteNotMocked(hash: string) {
        return new this(`POST not mocked: ${hash}`, Status.BADREQUEST, this.code)
    }
    
}
