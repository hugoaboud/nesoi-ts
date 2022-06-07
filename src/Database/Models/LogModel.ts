import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'
import { Level } from '../../Log'

export default class LogModel extends BaseModel {
  static table = 'logs';

  @column({ isPrimary: true })
  public id!: number
  
  @column()
  public user_id?: number

  @column()
  public level!: Level

  @column()
  public scope!: 'resource'|'job'

  @column()
  public scope_name!: string

  @column()
  public scope_id?: number
    
  @column()
  public event!: string

  @column()
  public origin!: string
  
  @column()
  public message!: string

  @column()
  public data!: Record<string,any>

  @column.dateTime({ autoCreate: true })
  public timestamp!: DateTime
  
}
