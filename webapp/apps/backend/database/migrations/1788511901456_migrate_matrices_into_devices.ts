import { TokenService } from '#services/token_service'
import { BaseSchema } from '@adonisjs/lucid/schema'
import { randomUUID } from 'node:crypto'

/**
 * `matrices` conflated the panel, the appliance driving it and the content it
 * displayed (docs/adr/0006-modele-renderer-device-scene.md). Each row becomes
 * a device and the scene it was showing, of the same geometry — so `k = 1`
 * (docs/adr/0018-geometrie-native-de-la-scene.md).
 *
 * Deferred rather than raw SQL because a credential has to be minted per row:
 * `matrices` carried none, its guard having been removed, so every migrated
 * device has to be paired again. The token is generated and discarded here —
 * only the fingerprint is stored, and nothing can hand a clear one back.
 */
export default class extends BaseSchema {
  protected tableName = 'matrices'

  async up() {
    this.defer(async (db) => {
      const matrices = await db
        .from(this.tableName)
        .select('id', 'name', 'width', 'height', 'user_id', 'config')

      if (matrices.length === 0) return

      const defaultRenderer = await db.from('renderers').where('is_default', true).first()

      if (!defaultRenderer) {
        throw new Error('Cannot migrate matrices without a default renderer to attach them to.')
      }

      const tokenService = new TokenService()

      for (const matrix of matrices) {
        const now = new Date()
        const sceneId = randomUUID()
        const credential = await tokenService.issue('device')

        await db.table('scenes').insert({
          id: sceneId,
          user_id: matrix.user_id,
          /**
           * Truncated to the 100 characters the scene validator accepts, so a
           * migrated scene can be renamed through the API like any other.
           */
          name: `${matrix.name} scene`.slice(0, 100),
          width: matrix.width,
          height: matrix.height,
          target_fps: 30,
          /**
           * The old `config` was a free-form object nothing validated, and the
           * node catalogue of the versioned envelope is still empty: there is
           * no shape to convert it into. Reset to an empty scene rather than
           * store something the schema would reject on the next write.
           */
          config: JSON.stringify({ version: 1, nodes: [] }),
          version: 1,
          created_at: now,
          updated_at: now,
        })

        await db.table('devices').insert({
          id: matrix.id,
          user_id: matrix.user_id,
          renderer_id: defaultRenderer.id,
          scene_id: sceneId,
          name: matrix.name,
          token_prefix: credential.prefix,
          token_hash: credential.hash,
          panel_type: 'hub75',
          /**
           * An existing matrix describes real hardware
           * (docs/adr/0020-simulateur-device-declare.md).
           */
          kind: 'hardware',
          width: matrix.width,
          height: matrix.height,
          chain_length: 1,
          brightness: 128,
          max_fps: null,
          offline_grace: 604800,
          status: 'offline',
          created_at: now,
          updated_at: now,
        })
      }
    })

    this.schema.dropTable(this.tableName)
  }

  /**
   * Lossy, and unavoidably so: the credentials minted above were never stored
   * in clear, the renderer a device was attached to and everything the split
   * introduced — `kind`, `brightness`, `maxFps`, `offlineGrace`, the observed
   * fields — have nowhere to go back to, and the device/scene pairing does not
   * survive a table that holds one row for both. A device showing no scene
   * comes back with an empty config, and the scenes created above stay behind:
   * nothing tells them apart from the ones authored since.
   */
  async down() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id').notNullable().primary()

      table.string('name').notNullable()

      table.integer('width').checkPositive().notNullable()
      table.integer('height').checkPositive().notNullable()

      table.json('config').notNullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')

      table.string('user_id').notNullable()
      table.foreign('user_id').references('users.id').onDelete('CASCADE')
    })

    this.schema.raw(
      `INSERT INTO ${this.tableName} (id, name, width, height, config, created_at, updated_at, user_id)
       SELECT devices.id, devices.name, devices.width, devices.height,
              COALESCE(scenes.config, '{}'::jsonb), devices.created_at, devices.updated_at, devices.user_id
       FROM devices LEFT JOIN scenes ON scenes.id = devices.scene_id`
    )
  }
}
