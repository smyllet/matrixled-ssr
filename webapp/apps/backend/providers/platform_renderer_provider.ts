import type { ApplicationService } from '@adonisjs/core/types'

/**
 * The platform renderer has no owner, so nobody can pair it from the dashboard.
 * Its credential is therefore declared by the deployment and applied at boot.
 * See docs/adr/0013-provisionnement-du-renderer-plateforme.md
 */
export default class PlatformRendererProvider {
  constructor(protected app: ApplicationService) {}

  async ready() {
    /**
     * Only the running server provisions. Commands and the test suite have no
     * business rewriting a credential.
     */
    if (this.app.getEnvironment() !== 'web') return

    const env = await import('#start/env')
    const token = env.default.get('PLATFORM_RENDERER_TOKEN')

    if (!token) return

    const { RendererService } = await import('#services/renderer_service')
    const rendererService = await this.app.container.make(RendererService)
    const logger = await this.app.container.make('logger')

    try {
      const renderer = await rendererService.provisionPlatformRenderer(token)

      if (!renderer) {
        logger.warn('No default renderer to provision. Has the database been migrated?')
      }
    } catch (error) {
      /**
       * A malformed token is a configuration error and must be fixed, not
       * worked around: refuse to start rather than leave the shared renderer
       * silently unable to connect.
       */
      if (error instanceof Error && error.message.startsWith('PLATFORM_RENDERER_TOKEN')) {
        throw error
      }

      logger.warn({ err: error }, 'Could not provision the platform renderer credential')
    }
  }
}
