import { deviceCredentials, rendererCredentials } from '#guards/credentials'
import { tokenGuard } from '#guards/token_guard'
import { defineConfig } from '@adonisjs/auth'
import { sessionGuard, sessionUserProvider } from '@adonisjs/auth/session'
import type { Authenticators, InferAuthEvents } from '@adonisjs/auth/types'

const authConfig = defineConfig({
  /**
   * Default guard used when no guard is explicitly specified.
   */
  default: 'web',

  guards: {
    /**
     * Session-based guard for browser authentication.
     */
    web: sessionGuard({
      /**
       * Enable persistent login using remember-me tokens.
       */
      useRememberMeTokens: false,

      provider: sessionUserProvider({
        model: () => import('#models/user'),
      }),
    }),

    /**
     * Bearer-token guards for the two non-browser clients. Each accepts only
     * its own scope, so a device token is refused on a renderer route and the
     * other way round (docs/adr/0012-format-des-tokens.md).
     */
    device: tokenGuard(deviceCredentials),
    renderer: tokenGuard(rendererCredentials),
  },
})

export default authConfig

/**
 * Inferring types from the configured auth
 * guards.
 */
declare module '@adonisjs/auth/types' {
  export interface Authenticators extends InferAuthenticators<typeof authConfig> {}
}
declare module '@adonisjs/core/types' {
  interface EventsList extends InferAuthEvents<Authenticators> {}
}
