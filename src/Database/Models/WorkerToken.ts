import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'

export default class WorkerToken extends BaseModel {
    public static table = 'worker_tokens'

    @column({ isPrimary: true })
    public id!: number

    @column()
    public company_id!: number

    @column()
    public access_token!: string

    @column()
    public refresh_token!: string

    @column()
    public created_by!: number

    @column.dateTime({ autoCreate: true })
    public createdAt!: DateTime

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    public updatedAt!: DateTime

}
