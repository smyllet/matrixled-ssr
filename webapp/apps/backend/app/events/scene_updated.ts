import SceneEvent from '#events/base/scene_event'

export default class SceneUpdated extends SceneEvent {
  readonly name = 'scene.updated' as const
}
