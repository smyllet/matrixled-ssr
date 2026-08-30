import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'renderers'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id').notNullable().primary()

      /**
       * Null owner means the platform renderer, shared by every user.
       */
      table.string('owner_id').nullable()
      table.foreign('owner_id').references('users.id').onDelete('CASCADE')

      table.string('name').notNullable()

      /**
       * The prefix is a lookup key, not a secret: a renderer presents its token
       * without any identifier, so the prefix is what resolves it to a row.
       * See docs/adr/0012-format-des-tokens.md
       */
      table.string('token_prefix').notNullable().unique()
      table.string('token_hash').notNullable()

      table.boolean('is_default').notNullable().defaultTo(false)

      /**
       * Declared by the renderer when it connects, hence unknown until then.
       */
      table.string('version').nullable()
      table.jsonb('capabilities').nullable()
      table.string('endpoint').nullable()

      table
        .enum('status', ['online', 'offline'], {
          useNative: true,
          enumName: 'renderer_status',
        })
        .notNullable()
        .defaultTo('offline')
      table.timestamp('last_seen_at', { useTz: true }).nullable()

      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()
    })

    /**
     * "Exactly one renderer has is_default = true and owner_id = null" is a rule
     * from docs/DATA-MODEL.md. The index enforces "at most one" and the check
     * ties it to the platform; the follow-up migration inserts the row that
     * makes it exactly one.
     */
    this.schema.raw(
      `CREATE UNIQUE INDEX renderers_single_default_index ON ${this.tableName} (is_default) WHERE is_default`
    )
    this.schema.raw(
      `ALTER TABLE ${this.tableName} ADD CONSTRAINT renderers_default_is_platform_check CHECK (NOT is_default OR owner_id IS NULL)`
    )
  }

  async down() {
    this.schema.dropTable(this.tableName)
    this.schema.raw('DROP TYPE IF EXISTS renderer_status')
  }
}
