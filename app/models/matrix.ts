import { DateTime } from 'luxon'
import { BaseModel, beforeCreate, column, hasOne } from '@adonisjs/lucid/orm'
import User from './user.js'
import type { HasOne } from '@adonisjs/lucid/types/relations'
import string from '@adonisjs/core/helpers/string'

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
  static async assignToken(matrix: Matrix) {
    let token = ''

    do {
      token = string.generateRandom(TOKEN_SIZE)
    } while (await Matrix.query().where('token', token).first())

    matrix.token = token
  }
}
