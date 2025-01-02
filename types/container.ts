import { RendererService } from '#services/renderer_service'

declare module '@adonisjs/core/types' {
  interface ContainerBindings {
    renderer: RendererService
  }
}
