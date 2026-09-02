import DomainEvent from '#events/base/domain_event'
import type Renderer from '#models/renderer'

/**
 * `renderer` is a live reference, not a snapshot: a listener sees whatever the
 * instance holds when it runs, a later mutation from the same request included,
 * and a deleted renderer is still readable in memory but must not be saved or
 * queried through. Read what you need synchronously.
 *
 * `userId` is null for the platform renderer, which belongs to no user. The
 * event still fires — filtering it is each listener's business, not the
 * service's.
 */
export default abstract class RendererEvent extends DomainEvent {
  constructor(public renderer: Renderer) {
    super()
  }

  get userId() {
    return this.renderer.ownerId
  }

  get id() {
    return this.renderer.id
  }
}
