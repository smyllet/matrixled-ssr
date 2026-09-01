import Scene from '#models/scene'
import { sceneGeometryValidator, type SceneConfig } from '#validators/scene'

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
      await sceneGeometryValidator.validate({ width: mergedWidth, height: mergedHeight })
    }

    scene.name = patch.name ?? scene.name
    scene.width = mergedWidth
    scene.height = mergedHeight
    scene.targetFps = patch.targetFps ?? scene.targetFps
    scene.config = patch.config ?? scene.config

    /**
     * Any change bumps the version, a rename included — the control plane
     * diffs on `scene_id` + `version` (docs/adr/0019-cadence-portee-par-la-scene.md)
     * and an occasional diff over a field it ignores is cheaper than the
     * bookkeeping needed to avoid it.
     *
     * Lucid answers "did anything change" by deep-comparing the attributes
     * against the loaded row, so a client repeating the whole form on every
     * save — the edit sheet does — bumps nothing until a value really moves.
     * Read before `save()`, which resets the tracking.
     */
    const modified = scene.$isDirty

    await scene.save()

    /**
     * Incremented in SQL rather than read-modify-written in JS: two patches
     * racing on the same scene would both read the same version and write the
     * same successor, and the lost bump leaves every renderer serving a stale
     * scene until the next change. Reload so the response carries the version
     * the database settled on.
     */
    if (modified) {
      await Scene.query().where('id', scene.id).increment('version', 1)
      await scene.refresh()
    }

    return scene
  }

  async deleteScene(scene: Scene) {
    await scene.delete()
  }
}
