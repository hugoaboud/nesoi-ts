import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'

export default class TrashModel extends BaseModel {
  static table = '__trash__';

  @column({ isPrimary: true })
  public id!: number
  
  @column()
  public table!: string
  
  @column()
  public obj_id!: number

  @column()
  public obj!: Record<string, any>

  @column.dateTime({ autoCreate: true })
  public deleted_at!: DateTime

  @column()
  public deleted_by?: number
    
}
