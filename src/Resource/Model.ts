import { DateTime } from 'luxon'
import { BaseModel as AdonisBaseModel, column, ModelQueryBuilderContract } from '@ioc:Adonis/Lucid/Orm'
import { Client } from '../Auth/Client'
import { Pagination } from './Helpers/Pagination'
import { ColumnBasedMultiTenancy, MultiTenancy } from './Helpers/MultiTenancy';
import { Config } from '../Config';

export default class BaseModel extends AdonisBaseModel {

  public static multi_tenancy = new ColumnBasedMultiTenancy(
    Config.get('MultiTenancy').column,
    Config.get('MultiTenancy').user_key
  ) as MultiTenancy|undefined;

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
  
  private static filterByTenant<M extends typeof BaseModel>(this: M, client: Client, query: ModelQueryBuilderContract<any, any>) {
    if (client.super_tenant.includes('*'))
      return query
    if (client.super_tenant.includes(this.table))
      return query
    if (!this.multi_tenancy)
      return query
    return this.multi_tenancy.decorateReadQuery(client, query);
  }

  static async readOne<M extends typeof BaseModel>(this: M, client: Client, id: number) {
    let query = this.query();
    if (client.trx) query = query.useTransaction(client.trx);
    this.filterByTenant(client, query)
    query = query.whereNot('state', 'deleted');
    return query.where('id', id).first();
  }
  
  static async readAll<M extends typeof BaseModel>(this: M, client: Client, pagination?: Pagination) {
    let query = this.query();
    if (client.trx) query = query.useTransaction(client.trx);
    this.filterByTenant(client, query)
    query = query.whereNot('state', 'deleted');
    if (pagination) query = pagination.decorateReadQuery(query);
    query = query.orderBy('updated_at', 'desc');
    return query;
  }
  
  static async readOneGroup<M extends typeof BaseModel>(this: M, client: Client, key: string, value: string | number) {
    let query = this.query();
    if (client.trx) query = query.useTransaction(client.trx);
    this.filterByTenant(client, query)
    query = query.whereNot('state', 'deleted');
    return query.where(key, value);
  }

}
