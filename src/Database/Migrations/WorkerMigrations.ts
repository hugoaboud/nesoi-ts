import BaseSchema from '@ioc:Adonis/Lucid/Schema'
import { JobStatus } from '../Models/WorkerJob'

export class WorkerTokens extends BaseSchema {
    protected tableName = 'worker_tokens'

    public async up () {
        this.schema.createTable(this.tableName, (table) => {
            table.increments('id')
            table.integer('company_id').notNullable()
            table.string('access_token').notNullable()
            table.string('refresh_token').notNullable()
            table.integer('created_by').notNullable()
            table.timestamp('created_at', { useTz: true }).notNullable()
            table.timestamp('updated_at', { useTz: true }).notNullable()
        })
    }

  public async down () {
    this.schema.dropTable(this.tableName)
  }
}

export class WorkerJobs extends BaseSchema {
  protected tableName = 'worker_jobs'

    public async up () {
        this.schema.createTable(this.tableName, (table) => {
            table.increments('id')
            table.string('client_id').notNullable()
            table.integer('user_id').notNullable()
            table.integer('company_id').notNullable()
            table.boolean('confirmed').notNullable()
            table.string('type').notNullable()
            table.jsonb('input').notNullable()
            table.jsonb('output')
            table.enum('status',Object.values(JobStatus)).notNullable()
            table.integer('attempts').notNullable()
            table.integer('max_attempts').notNullable()
            table.timestamp('created_at', { useTz: true }).notNullable()
            table.timestamp('updated_at', { useTz: true }).notNullable()
        })
    }

    public async down () {
        this.schema.dropTable(this.tableName)
    }
}

export class WorkerLogs extends BaseSchema {
    protected tableName = 'worker_logs'

    public async up () {
        this.schema.createTable(this.tableName, (table) => {
            table.increments('id')
            table.integer('job_id').notNullable().references('id').inTable('worker_jobs')
            table.integer('attempt').notNullable()
            table.specificType('log','jsonb[]').notNullable()
            table.timestamp('created_at', { useTz: true }).notNullable()
            table.timestamp('updated_at', { useTz: true }).notNullable()
        })
    }

  public async down () {
    this.schema.dropTable(this.tableName)
  }
}
