import SceneEvent from '#events/base/scene_event'

export default class SceneCreated extends SceneEvent {
  readonly name = 'scene.created' as const
}
