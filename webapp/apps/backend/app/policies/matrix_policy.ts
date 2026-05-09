import type User from '#models/user'
import type Matrix from '#models/matrix'
import { BasePolicy } from '@adonisjs/bouncer'
import type { AuthorizerResponse } from '@adonisjs/bouncer/types'

export default class MatrixPolicy extends BasePolicy {
  show(user: User, matrix: Matrix): AuthorizerResponse {
    return user.id === matrix.userId
  }

  patch(user: User, matrix: Matrix): AuthorizerResponse {
    return user.id === matrix.userId
  }

  delete(user: User, matrix: Matrix): AuthorizerResponse {
    return user.id === matrix.userId
  }
}
