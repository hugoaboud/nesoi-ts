import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'

export enum JobStatus {
    Queued='queued',
    Running='running',
    Done='done',
    Error='error',
    Unauthorized='unauthorized'
}

export default class WorkerJob extends BaseModel {
    public static table = 'worker_jobs'

    @column({ isPrimary: true })
    public id!: number

    @column()
    public client_id!: string
    
    @column()
    public user_id!: number
    
    @column()
    public company_id!: number
    
    @column()
    public confirmed!: boolean
    
    @column()
    public type!: string
    
    @column()
    public input!: Record<string,any>
    
    @column()
    public output?: Record<string,any>
    
    @column()
    public status!: JobStatus
    
    @column()
    public attempts!: number
    
    @column()
    public max_attempts!: number

    @column.dateTime({ autoCreate: true })
    public createdAt!: DateTime

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    public updatedAt!: DateTime

}