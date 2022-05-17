import { DateTime } from 'luxon'
import { BaseModel as AdonisBaseModel, column } from '@ioc:Adonis/Lucid/Orm'

export default class BaseModel extends AdonisBaseModel {

  @column({ isPrimary: true })
  public id!: number
  
  @column()
  public state!: string

  @column()
  public created_by!: number

  @column()
  public updated_by!: number
  
  @column()
  public deleted_by?: number
  
  @column.dateTime({ autoCreate: true })
  public created_at!: DateTime
  
  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updated_at!: DateTime

  @column.dateTime()
  public deleted_at?: DateTime
  
}
