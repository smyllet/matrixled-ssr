import SceneEvent from '#events/base/scene_event'

export default class SceneDeleted extends SceneEvent {
  readonly name = 'scene.deleted' as const
}
