import { BaseSchema } from '@adonisjs/lucid/schema'
import hash from '@adonisjs/core/services/hash'
import { randomBytes, randomUUID } from 'node:crypto'

export default class extends BaseSchema {
  protected tableName = 'renderers'

  /**
   * The platform renderer must exist before any device can reference it, and
   * "exactly one renderer is the default" cannot be true of an empty table.
   *
   * Its credential is generated and immediately discarded: the usable one comes
   * from `PLATFORM_RENDERER_TOKEN`, applied at boot. This row only has to be
   * valid, never usable — a renderer with no owner cannot be paired from the
   * dashboard. See docs/adr/0013-provisionnement-du-renderer-plateforme.md
   */
  async up() {
    const secret = randomBytes(32).toString('hex')

    this.defer(async (db) => {
      await db.table(this.tableName).insert({
        id: randomUUID(),
        owner_id: null,
        name: 'Platform renderer',
        token_prefix: randomBytes(6).toString('hex'),
        token_hash: await hash.make(secret),
        is_default: true,
        status: 'offline',
        created_at: new Date(),
        updated_at: new Date(),
      })
    })
  }

  async down() {
    this.defer(async (db) => {
      await db.from(this.tableName).where('is_default', true).delete()
    })
  }
}
