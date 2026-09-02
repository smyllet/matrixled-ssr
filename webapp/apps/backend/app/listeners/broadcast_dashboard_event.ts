import type DomainEvent from '#events/base/domain_event'
import { BroadcastService } from '#services/broadcast_service'
import { inject } from '@adonisjs/core'

@inject()
export default class BroadcastDashboardEvent {
  constructor(protected broadcastService: BroadcastService) {}

  handle(event: DomainEvent) {
    /**
     * An entity with no owner belongs to the platform, and the platform is
     * visible to everybody: `RendererService.getVisibleRenderers` hands the
     * ownerless renderer to every user, so every dashboard is holding a row
     * that just went stale.
     */
    if (!event.userId) {
      this.broadcastService.toPlatform(event.name, { id: event.id })
      return
    }

    this.broadcastService.toUser(event.userId, event.name, { id: event.id })
  }
}
