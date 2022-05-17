import { DateTime } from 'luxon'
import { BaseModel as AdonisBaseModel, column, LucidRow } from '@ioc:Adonis/Lucid/Orm'

export default class BaseModel extends AdonisBaseModel {

  @column({ isPrimary: true })
  public id!: number

  @column()
  public created_by!: number

  @column()
  public deleted_at!: DateTime

  @column()
  public deleted_by!: number

  @column.dateTime({ autoCreate: true })
  public created_at!: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updated_at!: DateTime
  
}

export interface NodeModel extends LucidRow {
    id: number,
    created_by: number,
    deleted_at: DateTime,
    deleted_by: number
}

/**
 * Decorator that marks an id parameter as a parent.
 * @returns 
 */
 export function parent() {
  return function(target: any, param: string) { 
      if (!target.constructor['$parents'])
        target.constructor['$parents'] = new Set();
      target.constructor['$parents'].add(param);
  }
}