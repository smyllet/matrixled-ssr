import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'devices'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id').notNullable().primary()

      table.string('user_id').notNullable()
      table.foreign('user_id').references('users.id').onDelete('CASCADE')

      /**
       * Every listing is scoped to one owner, and a foreign key creates no
       * index of its own in PostgreSQL.
       */
      table.index(['user_id'], 'devices_user_id_index')

      /**
       * RESTRICT: a renderer still serving devices must not disappear from
       * under them, and the platform renderer never disappears at all.
       */
      table.string('renderer_id').notNullable()
      table.foreign('renderer_id').references('renderers.id').onDelete('RESTRICT')
      table.index(['renderer_id'], 'devices_renderer_id_index')

      /**
       * No scene is a black screen, not an error: deleting a scene detaches
       * the devices showing it rather than taking them down with it.
       */
      table.string('scene_id').nullable()
      table.foreign('scene_id').references('scenes.id').onDelete('SET NULL')
      table.index(['scene_id'], 'devices_scene_id_index')

      table.string('name').notNullable()

      /**
       * The prefix is a lookup key, not a secret: a device presents its token
       * without any identifier, so the prefix is what resolves it to a row.
       * See docs/adr/0012-format-des-tokens.md
       */
      table.string('token_prefix').notNullable().unique()
      table.string('token_hash').notNullable()

      /**
       * A single value today (docs/adr/0005-hub75-dabord.md), an enum because
       * it is the discriminant addressable strips will be added to.
       */
      table
        .enum('panel_type', ['hub75'], { useNative: true, enumName: 'device_panel_type' })
        .notNullable()
        .defaultTo('hub75')

      /**
       * Chosen at creation and never edited afterwards: a simulator is a
       * device of its own, not a panel a browser tab borrows
       * (docs/adr/0020-simulateur-device-declare.md).
       */
      table
        .enum('kind', ['hardware', 'simulator'], { useNative: true, enumName: 'device_kind' })
        .notNullable()
        .defaultTo('hardware')

      /**
       * The geometry the panel actually lights up. A scene is displayable on
       * it when it divides it by the same integer factor on both axes
       * (docs/adr/0018-geometrie-native-de-la-scene.md) — a pair the CHECK
       * constraints below cannot express, so DeviceService carries that rule.
       */
      table.integer('width').notNullable()
      table.integer('height').notNullable()

      /**
       * Wiring information for the firmware; it says nothing about the image.
       */
      table.integer('chain_length').notNullable().defaultTo(1)

      table.integer('brightness').notNullable().defaultTo(128)

      /**
       * Null is the default and means no cap: the cadence belongs to the
       * scene (docs/adr/0019-cadence-portee-par-la-scene.md).
       */
      table.integer('max_fps').nullable()

      /**
       * Seconds a renderer may keep serving this device without hearing from
       * the platform. Null is unlimited
       * (docs/adr/0015-bail-de-session-device.md).
       */
      table.integer('offline_grace').nullable().defaultTo(604800)

      /**
       * Declared by the device when it connects, hence unknown until then.
       */
      table.string('firmware_version').nullable()
      table.integer('protocol_version').nullable()

      table
        .enum('status', ['online', 'offline', 'error'], {
          useNative: true,
          enumName: 'device_status',
        })
        .notNullable()
        .defaultTo('offline')
      table.timestamp('last_seen_at', { useTz: true }).nullable()

      /**
       * Observed on the connection, never submitted. `inet` rather than a
       * string so PostgreSQL rejects what is not an address.
       */
      table.specificType('ip_address', 'inet').nullable()

      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()
    })

    /**
     * The literals mirror `PROTOCOL_MAXIMUM_PIXELS` and the bounds of
     * app/constants/device.ts on purpose: a migration is a snapshot of the
     * schema at its date and must not move when an application constant does.
     */
    this.schema.raw(
      `ALTER TABLE ${this.tableName} ADD CONSTRAINT devices_geometry_bounded_check CHECK (width * height <= 65536)`
    )
    this.schema.raw(
      `ALTER TABLE ${this.tableName} ADD CONSTRAINT devices_geometry_positive_check CHECK (width > 0 AND height > 0)`
    )
    this.schema.raw(
      `ALTER TABLE ${this.tableName} ADD CONSTRAINT devices_chain_length_positive_check CHECK (chain_length > 0)`
    )
    this.schema.raw(
      `ALTER TABLE ${this.tableName} ADD CONSTRAINT devices_brightness_bounded_check CHECK (brightness BETWEEN 0 AND 255)`
    )
    this.schema.raw(
      `ALTER TABLE ${this.tableName} ADD CONSTRAINT devices_max_fps_bounded_check CHECK (max_fps IS NULL OR max_fps BETWEEN 1 AND 60)`
    )
    this.schema.raw(
      `ALTER TABLE ${this.tableName} ADD CONSTRAINT devices_offline_grace_positive_check CHECK (offline_grace IS NULL OR offline_grace > 0)`
    )
  }

  async down() {
    this.schema.dropTable(this.tableName)
    this.schema.raw('DROP TYPE IF EXISTS device_panel_type')
    this.schema.raw('DROP TYPE IF EXISTS device_kind')
    this.schema.raw('DROP TYPE IF EXISTS device_status')
  }
}
