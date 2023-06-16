import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class Trash extends BaseSchema {
    protected tableName = '__trash__'

    public async up () {
        this.schema.createTable(this.tableName, (table) => {
            table.increments('id')
            table.string('table').notNullable()
            table.integer('obj_id').notNullable()
            table.specificType('obj','jsonb').notNullable()
            table.timestamp('deleted_at', { useTz: true }).notNullable()
            table.integer('deleted_by').notNullable()
        })
    }

  public async down () {
    this.schema.dropTable(this.tableName)
  }
}
