import { RendererSchema } from '#database/schema'
import { beforeCreate, belongsTo } from '@adonisjs/lucid/orm'
import User from './user.ts'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class Renderer extends RendererSchema {
  static selfAssignPrimaryKey = true

  /**
   * A null owner is the platform renderer, shared by every user.
   */
  @belongsTo(() => User, { foreignKey: 'ownerId' })
  declare owner: BelongsTo<typeof User>

  get isPlatformRenderer() {
    return this.ownerId === null
  }

  @beforeCreate()
  static assignUuid(renderer: Renderer) {
    if (renderer.id) return
    renderer.id = crypto.randomUUID()
  }
}
