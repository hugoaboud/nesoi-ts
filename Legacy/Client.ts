import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

export default class Client {

    user_id: number

    constructor(_ctx: HttpContextContract) {
        this.user_id = 1;
    }

}