import type User from '#models/user'
import type Renderer from '#models/renderer'
import { BasePolicy } from '@adonisjs/bouncer'
import type { AuthorizerResponse } from '@adonisjs/bouncer/types'

export default class RendererPolicy extends BasePolicy {
  /**
   * The platform renderer is readable by everyone: any user can have devices
   * served by it.
   */
  show(user: User, renderer: Renderer): AuthorizerResponse {
    return renderer.isPlatformRenderer || user.id === renderer.ownerId
  }

  /**
   * Owner-only, which excludes the platform renderer: it has no owner, so it is
   * administered from the console rather than from the dashboard.
   */
  patch(user: User, renderer: Renderer): AuthorizerResponse {
    return user.id === renderer.ownerId
  }

  delete(user: User, renderer: Renderer): AuthorizerResponse {
    return user.id === renderer.ownerId
  }

  rotateToken(user: User, renderer: Renderer): AuthorizerResponse {
    return user.id === renderer.ownerId
  }
}
