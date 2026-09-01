import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'scenes'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id').notNullable().primary()

      table.string('user_id').notNullable()
      table.foreign('user_id').references('users.id').onDelete('CASCADE')

      /**
       * Every listing is scoped to one owner, and a foreign key creates no
       * index of its own in PostgreSQL.
       */
      table.index(['user_id'], 'scenes_user_id_index')

      table.string('name').notNullable()

      /**
       * The geometry a scene is authored for, not the device it ends up on
       * (docs/adr/0018-geometrie-native-de-la-scene.md).
       */
      table.integer('width').notNullable()
      table.integer('height').notNullable()

      table.integer('target_fps').notNullable().defaultTo(30)

      /**
       * Versioned, validated envelope — see app/validators/scene.ts. Not the
       * same "version" as the column below: this one is the envelope format's
       * own version, bumped only if the shape of `config` itself changes.
       */
      table.jsonb('config').notNullable()

      /**
       * Row revision, bumped by SceneService on every change.
       * The control plane diffs on `scene_id` + this column
       * (docs/adr/0019-cadence-portee-par-la-scene.md).
       */
      table.integer('version').notNullable().defaultTo(1)

      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()
    })

    /**
     * The literals mirror `PROTOCOL_MAXIMUM_PIXELS` and the validator's fps
     * bounds on purpose: a migration is a snapshot of the schema at its date
     * and must not move when an application constant does.
     */
    this.schema.raw(
      `ALTER TABLE ${this.tableName} ADD CONSTRAINT scenes_geometry_bounded_check CHECK (width * height <= 65536)`
    )
    this.schema.raw(
      `ALTER TABLE ${this.tableName} ADD CONSTRAINT scenes_target_fps_bounded_check CHECK (target_fps BETWEEN 1 AND 60)`
    )
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
