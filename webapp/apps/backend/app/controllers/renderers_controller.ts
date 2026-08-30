import RendererPolicy from '#policies/renderer_policy'
import { RendererService } from '#services/renderer_service'
import RendererTransformer from '#transformers/renderer_transformer'
import RendererWithTokenTransformer from '#transformers/renderer_with_token_transformer'
import {
  createRendererValidator,
  deleteRendererValidator,
  patchRendererValidator,
  rotateRendererTokenValidator,
  showRendererValidator,
} from '#validators/renderer'
import { inject } from '@adonisjs/core'
import { type HttpContext } from '@adonisjs/core/http'

@inject()
export default class RenderersController {
  constructor(protected rendererService: RendererService) {}

  async index({ auth, serialize }: HttpContext) {
    const user = auth.getUserOrFail()

    const renderers = await this.rendererService.getVisibleRenderers(user.id)

    return serialize(RendererTransformer.transform(renderers))
  }

  async show({ request, serialize, bouncer }: HttpContext) {
    const {
      params: { id: rendererId },
    } = await request.validateUsing(showRendererValidator)

    const renderer = await this.rendererService.getRendererById(rendererId)

    await bouncer.with(RendererPolicy).authorize('show', renderer)

    return serialize(RendererTransformer.transform(renderer))
  }

  async store({ auth, request, serialize, response }: HttpContext) {
    const { name } = await request.validateUsing(createRendererValidator)

    const user = auth.getUserOrFail()

    const { renderer, token } = await this.rendererService.createRenderer({
      name,
      ownerId: user.id,
    })

    return response.created(
      await serialize(RendererWithTokenTransformer.transform(renderer, token))
    )
  }

  async patch({ request, serialize, bouncer }: HttpContext) {
    const {
      params: { id: rendererId },
      name,
    } = await request.validateUsing(patchRendererValidator)

    const renderer = await this.rendererService.getRendererById(rendererId)

    await bouncer.with(RendererPolicy).authorize('patch', renderer)

    const updatedRenderer = await this.rendererService.patchRenderer(renderer, { name })

    return serialize(RendererTransformer.transform(updatedRenderer))
  }

  async delete({ request, bouncer, response }: HttpContext) {
    const {
      params: { id: rendererId },
    } = await request.validateUsing(deleteRendererValidator)

    const renderer = await this.rendererService.getRendererById(rendererId)

    await bouncer.with(RendererPolicy).authorize('delete', renderer)

    await this.rendererService.deleteRenderer(renderer)

    return response.noContent()
  }

  /**
   * Issues a new credential and invalidates the previous one.
   */
  async rotateToken({ request, serialize, bouncer }: HttpContext) {
    const {
      params: { id: rendererId },
    } = await request.validateUsing(rotateRendererTokenValidator)

    const renderer = await this.rendererService.getRendererById(rendererId)

    await bouncer.with(RendererPolicy).authorize('rotateToken', renderer)

    const { renderer: rotatedRenderer, token } = await this.rendererService.rotateToken(renderer)

    return serialize(RendererWithTokenTransformer.transform(rotatedRenderer, token))
  }
}
