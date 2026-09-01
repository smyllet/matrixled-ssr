import type User from '#models/user'
import type Scene from '#models/scene'
import { BasePolicy } from '@adonisjs/bouncer'
import type { AuthorizerResponse } from '@adonisjs/bouncer/types'

export default class ScenePolicy extends BasePolicy {
  show(user: User, scene: Scene): AuthorizerResponse {
    return user.id === scene.userId
  }

  patch(user: User, scene: Scene): AuthorizerResponse {
    return user.id === scene.userId
  }

  delete(user: User, scene: Scene): AuthorizerResponse {
    return user.id === scene.userId
  }
}
