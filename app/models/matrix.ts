import RendererService from '#services/renderer_service'
import string from '@adonisjs/core/helpers/string'
import {
  afterCreate,
  afterDelete,
  afterUpdate,
  BaseModel,
  beforeCreate,
  column,
  hasOne,
} from '@adonisjs/lucid/orm'
import type { HasOne } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import User from './user.js'

const TOKEN_SIZE = 64

export default class Matrix extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare name: string

  @column()
  declare width: number

  @column()
  declare height: number

  @column()
  declare config: string

  @column({ serializeAs: null })
  declare token: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @hasOne(() => User, {
    foreignKey: 'id',
    localKey: 'userId',
  })
  declare user: HasOne<typeof User>

  @beforeCreate()
  static async beforeCreate(matrix: Matrix) {
    if (!matrix.token) {
      let token = ''

      do {
        token = string.generateRandom(TOKEN_SIZE)
      } while (await Matrix.query().where('token', token).first())

      matrix.token = token
    }

    if (!matrix.config) {
      matrix.config = JSON.stringify({
        version: 1,
        panels: [],
      })
    }
  }

  @afterCreate()
  static async afterCreate(matrix: Matrix) {
    await RendererService.addMatrix(matrix)
  }

  @afterUpdate()
  static async afterUpdate(matrix: Matrix) {
    RendererService.deleteMatrix(matrix)
    await RendererService.addMatrix(matrix)
  }

  @afterDelete()
  static async afterDelete(matrix: Matrix) {
    RendererService.deleteMatrix(matrix)
  }
}
