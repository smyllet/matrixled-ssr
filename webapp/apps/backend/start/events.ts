/*
|--------------------------------------------------------------------------
| Domain events
|--------------------------------------------------------------------------
|
| Services emit these on every successful mutation. Broadcasting over SSE is
| one listener among those a later consumer — audit log, webhooks, #47's device
| status — can attach here without touching the services again.
|
*/

import DeviceCreated from '#events/device_created'
import DeviceDeleted from '#events/device_deleted'
import DeviceUpdated from '#events/device_updated'
import RendererCreated from '#events/renderer_created'
import RendererDeleted from '#events/renderer_deleted'
import RendererUpdated from '#events/renderer_updated'
import SceneCreated from '#events/scene_created'
import SceneDeleted from '#events/scene_deleted'
import SceneUpdated from '#events/scene_updated'
import emitter from '@adonisjs/core/services/emitter'
import logger from '@adonisjs/core/services/logger'

const broadcastDashboardEvent = () => import('#listeners/broadcast_dashboard_event')

/**
 * Services dispatch and move on: a notification that fails must not fail the
 * mutation that caused it, so nothing awaits the emitter. Without a handler
 * here, `emit()` rethrows into a promise nobody awaits and Node turns that
 * unhandled rejection into a dead process — a broken listener would take the
 * server down instead of dropping one dashboard refresh.
 */
emitter.onError((event, error) => {
  logger.error(
    { err: error, event: typeof event === 'function' ? event.name : event },
    'A domain event listener failed'
  )
})

emitter.on(DeviceCreated, [broadcastDashboardEvent])
emitter.on(DeviceUpdated, [broadcastDashboardEvent])
emitter.on(DeviceDeleted, [broadcastDashboardEvent])
emitter.on(SceneCreated, [broadcastDashboardEvent])
emitter.on(SceneUpdated, [broadcastDashboardEvent])
emitter.on(SceneDeleted, [broadcastDashboardEvent])
emitter.on(RendererCreated, [broadcastDashboardEvent])
emitter.on(RendererUpdated, [broadcastDashboardEvent])
emitter.on(RendererDeleted, [broadcastDashboardEvent])
