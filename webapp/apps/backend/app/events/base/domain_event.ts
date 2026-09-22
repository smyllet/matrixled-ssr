import { BaseEvent } from '@adonisjs/core/events'

/**
 * The name every domain event answers to. It shares its vocabulary with the
 * dashboard catalogue of `docs/PROTOCOL-DASHBOARD.md`, but it is not a
 * transport concern: an audit log or a webhook listener reads the same names
 * without knowing that SSE exists.
 */
export type DomainEventName =
  | 'device.created'
  | 'device.updated'
  | 'device.deleted'
  | 'scene.created'
  | 'scene.updated'
  | 'scene.deleted'
  | 'renderer.created'
  | 'renderer.updated'
  | 'renderer.deleted'

/**
 * What a listener can rely on whatever the aggregate: who the change concerns,
 * what it concerns, and under which name. Listeners depend on this shape rather
 * than on a concrete event, so adding an aggregate never touches them.
 *
 * `userId` is nullable because not everything belongs to somebody — the
 * platform renderer has no owner. Such an event is still emitted: a listener
 * recording history wants it, and one notifying a browser simply has nobody to
 * notify.
 */
export default abstract class DomainEvent extends BaseEvent {
  abstract readonly name: DomainEventName
  abstract get userId(): string | null
  abstract get id(): string
}
