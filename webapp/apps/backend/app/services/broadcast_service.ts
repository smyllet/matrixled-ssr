import type { DomainEventName } from '#events/base/domain_event'
import transmit from '@adonisjs/transmit/services/main'

export const DASHBOARD_ENVELOPE_VERSION = 1 as const

/**
 * The dashboard catalogue is one-to-one with the domain events today, so it is
 * an alias rather than a second list to keep in step. The reserved
 * `device.status` (#26 → #28 → #47) is the first entry that will have no domain
 * event behind it, and that is when this becomes a union of its own.
 */
export type DashboardEventType = DomainEventName

export class BroadcastService {
  toUser(userId: string, type: DashboardEventType, payload: { id: string }) {
    transmit.broadcast(`users/${userId}`, { v: DASHBOARD_ENVELOPE_VERSION, type, payload })
  }

  /**
   * Reaches every authenticated dashboard, for the rows that belong to the
   * platform rather than to a user.
   */
  toPlatform(type: DashboardEventType, payload: { id: string }) {
    transmit.broadcast('platform', { v: DASHBOARD_ENVELOPE_VERSION, type, payload })
  }
}
