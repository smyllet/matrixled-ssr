import * as abilities from '#abilities/main'
import { policies } from '#generated/policies'

import type User from '#models/user'
import { Bouncer } from '@adonisjs/bouncer'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Init bouncer middleware is used to create a bouncer instance
 * during an HTTP request
 */
export default class InitializeBouncerMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    /**
     * Policies are about what a dashboard user owns, so the actor is read from
     * the session guard alone. `ctx.auth.user` would be whichever guard
     * authenticated last — a device or a renderer on their own routes.
     */
    ctx.bouncer = new Bouncer(
      () => ctx.auth.use('web').user || null,
      abilities,
      policies
    ).setContainerResolver(ctx.containerResolver)

    return next()
  }
}

declare module '@adonisjs/core/http' {
  export interface HttpContext {
    bouncer: Bouncer<User, typeof abilities, typeof policies>
  }
}
