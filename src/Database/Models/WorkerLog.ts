import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'
import { JobLog } from '../../Worker/JobLog'

export default class WorkerLog extends BaseModel {
    public static table = 'worker_logs'

    @column({ isPrimary: true })
    public id!: number

    @column()
    public job_id!: number

    @column()
    public attempt!: number

    @column()
    public log!: JobLog

    @column()
    public created_by!: number

    @column.dateTime({ autoCreate: true })
    public createdAt!: DateTime

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    public updatedAt!: DateTime

}
