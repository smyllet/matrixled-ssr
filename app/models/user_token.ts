import { DateTime, DurationLike } from 'luxon'
import { BaseModel, column, hasOne } from '@adonisjs/lucid/orm'
import User from './user.js'
import string from '@adonisjs/core/helpers/string'
import type { HasOne } from '@adonisjs/lucid/types/relations'

const TOKEN_SIZE = 64

const PASSWORD_RESET_TOKEN_TYPE = 'PASSWORD_RESET'
const EMAIL_VERIFICATION_TOKEN_TYPE = 'EMAIL_VERIFICATION'

const PASSWORD_RESET_TOKEN_DURATION: DurationLike = { minutes: 15 }
const EMAIL_VERIFICATION_TOKEN_DURATION: DurationLike = { days: 1 }

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

  static async deleteTokens(user: User, type: string) {
    await user.related('tokens').query().where('type', type).delete()
  }

  static async generateToken(user: User, type: string, duration: DurationLike) {
    await UserToken.deleteTokens(user, type)
    await UserToken.clearExpiredTokens()

    const token = string.generateRandom(TOKEN_SIZE)

    const record = await user.related('tokens').create({
      type,
      expiresAt: DateTime.now().plus(duration),
      token,
    })

    return record
  }

  static async getValidTokenUser(token: string, type: string) {
    const record = await UserToken.query()
      .preload('user')
      .where('type', type)
      .where('token', token)
      .where('expires_at', '>', DateTime.now().toSQL())
      .orderBy('created_at', 'desc')
      .first()

    return record?.user
  }

  static async generatePasswordResetToken(user: User) {
    return this.generateToken(user, PASSWORD_RESET_TOKEN_TYPE, PASSWORD_RESET_TOKEN_DURATION)
  }

  static async deleteUserPasswordResetTokens(user: User) {
    return this.deleteTokens(user, PASSWORD_RESET_TOKEN_TYPE)
  }

  static async getPasswordResetUser(token: string) {
    return this.getValidTokenUser(token, PASSWORD_RESET_TOKEN_TYPE)
  }

  static async generateEmailVerificationToken(user: User) {
    return this.generateToken(
      user,
      EMAIL_VERIFICATION_TOKEN_TYPE,
      EMAIL_VERIFICATION_TOKEN_DURATION
    )
  }

  static async deleteUserEmailVerificationTokens(user: User) {
    return this.deleteTokens(user, EMAIL_VERIFICATION_TOKEN_TYPE)
  }

  static async getEmailVerificationUser(token: string) {
    return this.getValidTokenUser(token, EMAIL_VERIFICATION_TOKEN_TYPE)
  }
}
