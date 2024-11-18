import { DateTime } from 'luxon'
import { BaseModel, column, hasOne } from '@adonisjs/lucid/orm'
import User from './user.js'
import string from '@adonisjs/core/helpers/string'
import type { HasOne } from '@adonisjs/lucid/types/relations'

export default class UserToken extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare type: string

  @column({ serializeAs: null })
  declare token: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @column.dateTime({ autoCreate: true })
  declare expiresAt: DateTime

  @hasOne(() => User, {
    foreignKey: 'id',
    localKey: 'userId',
  })
  declare user: HasOne<typeof User>

  static async clearExpiredTokens() {
    await UserToken.query().where('expires_at', '<=', DateTime.now().toSQL()).delete()
  }

  static async generatePasswordResetToken(user: User) {
    await UserToken.deleteUserPasswordResetTokens(user)
    await UserToken.clearExpiredTokens()

    const token = string.generateRandom(64)

    const record = await user.related('tokens').create({
      type: 'PASSWORD_RESET',
      expiresAt: DateTime.now().plus({ minutes: 15 }),
      token,
    })

    return record
  }

  static async deleteUserPasswordResetTokens(user: User) {
    await user.related('passwordResetToken').query().delete()
  }

  static async getPasswordResetUser(token: string) {
    const record = await UserToken.query()
      .preload('user')
      .where('type', 'PASSWORD_RESET')
      .where('token', token)
      .where('expires_at', '>', DateTime.now().toSQL())
      .orderBy('created_at', 'desc')
      .first()

    return record?.user
  }

  static async generateEmailVerificationToken(user: User) {
    await UserToken.deleteUserEmailVerificationTokens(user)
    await UserToken.clearExpiredTokens()

    const token = string.generateRandom(64)

    const record = await user.related('tokens').create({
      type: 'EMAIL_VERIFICATION',
      expiresAt: DateTime.now().plus({ days: 1 }),
      token,
    })

    return record
  }

  static async deleteUserEmailVerificationTokens(user: User) {
    await user.related('emailVerificationToken').query().delete()
  }

  static async getEmailVerificationUser(token: string) {
    const record = await UserToken.query()
      .preload('user')
      .where('type', 'EMAIL_VERIFICATION')
      .where('token', token)
      .where('expires_at', '>', DateTime.now().toSQL())
      .orderBy('created_at', 'desc')
      .first()

    return record?.user
  }
}
