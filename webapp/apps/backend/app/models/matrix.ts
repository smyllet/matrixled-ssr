import { MatrixSchema } from '#database/schema'
import { beforeCreate, belongsTo } from '@adonisjs/lucid/orm'
import User from './user.ts'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class Matrix extends MatrixSchema {
  static selfAssignPrimaryKey = true

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @beforeCreate()
  static assignUuid(matrix: Matrix) {
    if (matrix.id) return
    matrix.id = crypto.randomUUID()
  }
}
