import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export class WorkerLogs extends BaseSchema {
    protected tableName = 'logs'

    public async up () {
        this.schema.createTable(this.tableName, (table) => {
            table.increments('id')
            table.string('user_id')
            table.string('level').notNullable()
            table.string('scope').notNullable()
            table.string('scope_name').notNullable()
            table.string('scope_id')
            table.string('event').notNullable()
            table.string('origin').notNullable()
            table.string('message').notNullable()
            table.specificType('data','jsonb').notNullable()
            table.timestamp('created_at', { useTz: true }).notNullable()
            table.timestamp('updated_at', { useTz: true }).notNullable()
        })
    }

  public async down () {
    this.schema.dropTable(this.tableName)
  }
}
