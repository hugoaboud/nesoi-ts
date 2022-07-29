/**
    HTTP Exception Status

    Constantes de status para delimitar os códigos HTTP utilizados na aplicação.

    TODO: O Validator retorna códigos que estão fora dessa lista. Traduzi-los no Handler.
*/

export const Status = {
    OK: 200,
    UNAUTHORIZED: 401,
    BADREQUEST: 422,
    INTERNAL_SERVER: 500,
    BAD_GATEWAY: 502,
}
