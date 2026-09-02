import DomainEvent from '#events/base/domain_event'
import type Scene from '#models/scene'

/**
 * `scene` is a live reference, not a snapshot: a listener sees whatever the
 * instance holds when it runs, a later mutation from the same request included,
 * and a deleted scene is still readable in memory but must not be saved or
 * queried through. Read what you need synchronously.
 */
export default abstract class SceneEvent extends DomainEvent {
  constructor(public scene: Scene) {
    super()
  }

  get userId() {
    return this.scene.userId
  }

  get id() {
    return this.scene.id
  }
}
