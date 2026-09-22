import { DeviceSchema } from '#database/schema'
import { beforeCreate, belongsTo } from '@adonisjs/lucid/orm'
import Renderer from './renderer.ts'
import Scene from './scene.ts'
import User from './user.ts'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class Device extends DeviceSchema {
  static override selfAssignPrimaryKey = true

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Renderer)
  declare renderer: BelongsTo<typeof Renderer>

  /**
   * No scene is a black screen, not an error.
   */
  @belongsTo(() => Scene)
  declare scene: BelongsTo<typeof Scene>

  @beforeCreate()
  static assignUuid(device: Device) {
    if (device.id) return
    device.id = crypto.randomUUID()
  }
}
