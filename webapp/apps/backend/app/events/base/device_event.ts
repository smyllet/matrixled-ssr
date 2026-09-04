import DomainEvent from '#events/base/domain_event'
import type Device from '#models/device'

/**
 * `device` is a live reference, not a snapshot: a listener sees whatever the
 * instance holds when it runs, a later mutation from the same request included,
 * and a deleted device is still readable in memory but must not be saved or
 * queried through. Read what you need synchronously.
 */
export default abstract class DeviceEvent extends DomainEvent {
  constructor(public device: Device) {
    super()
  }

  get userId() {
    return this.device.userId
  }

  get id() {
    return this.device.id
  }
}
