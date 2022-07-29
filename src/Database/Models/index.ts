import { DateTime } from 'luxon'
import { BaseModel as AdonisBaseModel, column } from '@ioc:Adonis/Lucid/Orm'

/**
 * Decorator that marks a column as an array. This ensures filtering works.
 * @returns 
 */
 export function array() {
  return function(target: any, key: string) { 
      if (!target.constructor['$arrayColumns'])
      target.constructor['$arrayColumns'] = new Set();
      target.constructor['$arrayColumns'].add(key);
  }
}

export default class BaseModel extends AdonisBaseModel {

  @column({ isPrimary: true })
  public id!: number

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
