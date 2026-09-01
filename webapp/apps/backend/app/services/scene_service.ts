import Scene from '#models/scene'
import { sceneGeometrySchema, type SceneConfig } from '#validators/scene'
import vine from '@vinejs/vine'

const DEFAULT_SCENE_CONFIG: SceneConfig = { version: 1, nodes: [] }
const DEFAULT_TARGET_FPS = 30

export class SceneService {
  async getVisibleScenes(userId: string) {
    return Scene.query().where('user_id', userId).orderBy('created_at')
  }

  async getSceneById(sceneId: string) {
    return Scene.findOrFail(sceneId)
  }

  async createScene({
    name,
    width,
    height,
    targetFps,
    config,
    userId,
  }: {
    name: string
    width: number
    height: number
    targetFps?: number
    config?: SceneConfig
    userId: string
  }) {
    const scene = await Scene.create({
      name,
      width,
      height,
      userId,
      targetFps: targetFps ?? DEFAULT_TARGET_FPS,
      config: config ?? DEFAULT_SCENE_CONFIG,
    })

    /**
     * `version` is a database default, so the fresh instance does not carry
     * it. Reload so the response describes the stored row.
     */
    await scene.refresh()

    return scene
  }

  async patchScene(
    scene: Scene,
    patch: Partial<{
      name: string
      width: number
      height: number
      targetFps: number
      config: SceneConfig
    }>
  ) {
    const mergedWidth = patch.width ?? scene.width
    const mergedHeight = patch.height ?? scene.height

    /**
     * A patch touching only one of the two dimensions can't be checked by the
     * request validator, which never sees the sibling value still in the row.
     */
    if (patch.width !== undefined || patch.height !== undefined) {
      await vine.validate({
        schema: sceneGeometrySchema,
        data: { width: mergedWidth, height: mergedHeight },
      })
    }

    /**
     * Bumped when a render-relevant field is present in the patch, regardless
     * of whether the new value differs from the stored one — an occasional
     * spurious diff downstream is cheap, a missed one is a stale render.
     * `name` alone never bumps it: the render group key is `scene_id` +
     * `version` (docs/adr/0019-cadence-portee-par-la-scene.md), and a rename
     * carries nothing a renderer needs to re-diff.
     */
    const rendersDifferently =
      patch.width !== undefined ||
      patch.height !== undefined ||
      patch.targetFps !== undefined ||
      patch.config !== undefined

    scene.name = patch.name ?? scene.name
    scene.width = mergedWidth
    scene.height = mergedHeight
    scene.targetFps = patch.targetFps ?? scene.targetFps
    scene.config = patch.config ?? scene.config
    if (rendersDifferently) scene.version += 1

    await scene.save()

    return scene
  }

  async deleteScene(scene: Scene) {
    await scene.delete()
  }
}
