import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'
import { Client } from '../../Auth/Client';
import DBException from '../../Exception/DBException';

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

  static async new(client: Client, table: string, obj: { id: number, [x:string]: any}) {
      await super.create({
        table,
        obj_id: obj.id,
        obj,
        deleted_by: client.user.id
    }).catch((e: any) => {
        throw DBException(e)
    });
  }

}
