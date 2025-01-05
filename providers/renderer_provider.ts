import { RendererService } from '#services/renderer_service'
import emitter from '@adonisjs/core/services/emitter'
import { ApplicationService } from '@adonisjs/core/types'

export default class RendererProvider {
  constructor(protected app: ApplicationService) {}

  register() {
    this.app.container.singleton(RendererService, () => {
      return new RendererService()
    })

    this.app.container.alias('renderer', RendererService)
  }

  async start() {
    const renderer = await this.app.container.make('renderer')
    await renderer.initialize()

    emitter.on('matrix:model:created', async (matrix) => {
      await renderer.addMatrix(matrix)
    })

    emitter.on('matrix:model:updated', async (matrix) => {
      renderer.deleteMatrix(matrix)
      await renderer.addMatrix(matrix)
    })

    emitter.on('matrix:model:deleted', async (matrix) => {
      renderer.deleteMatrix(matrix)
    })
  }
}
