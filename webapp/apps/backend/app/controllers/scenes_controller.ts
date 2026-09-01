import ScenePolicy from '#policies/scene_policy'
import { SceneService } from '#services/scene_service'
import SceneTransformer from '#transformers/scene_transformer'
import {
  createSceneValidator,
  deleteSceneValidator,
  patchSceneValidator,
  showSceneValidator,
} from '#validators/scene'
import { inject } from '@adonisjs/core'
import { type HttpContext } from '@adonisjs/core/http'

@inject()
export default class ScenesController {
  constructor(protected sceneService: SceneService) {}

  async index({ auth, serialize }: HttpContext) {
    const user = auth.getUserOrFail()

    const scenes = await this.sceneService.getVisibleScenes(user.id)

    return serialize(SceneTransformer.transform(scenes))
  }

  async show({ request, serialize, bouncer }: HttpContext) {
    const {
      params: { id: sceneId },
    } = await request.validateUsing(showSceneValidator)

    const scene = await this.sceneService.getSceneById(sceneId)

    await bouncer.with(ScenePolicy).authorize('show', scene)

    return serialize(SceneTransformer.transform(scene))
  }

  async store({ auth, request, serialize, response }: HttpContext) {
    const { name, width, height, targetFps, config } =
      await request.validateUsing(createSceneValidator)

    const user = auth.getUserOrFail()

    const scene = await this.sceneService.createScene({
      name,
      width,
      height,
      targetFps,
      config,
      userId: user.id,
    })

    return response.created(await serialize(SceneTransformer.transform(scene)))
  }

  async patch({ request, serialize, bouncer }: HttpContext) {
    const {
      params: { id: sceneId },
      ...patch
    } = await request.validateUsing(patchSceneValidator)

    const scene = await this.sceneService.getSceneById(sceneId)

    await bouncer.with(ScenePolicy).authorize('patch', scene)

    const updatedScene = await this.sceneService.patchScene(scene, patch)

    return serialize(SceneTransformer.transform(updatedScene))
  }

  async delete({ request, bouncer, response }: HttpContext) {
    const {
      params: { id: sceneId },
    } = await request.validateUsing(deleteSceneValidator)

    const scene = await this.sceneService.getSceneById(sceneId)

    await bouncer.with(ScenePolicy).authorize('delete', scene)

    await this.sceneService.deleteScene(scene)

    return response.noContent()
  }
}
