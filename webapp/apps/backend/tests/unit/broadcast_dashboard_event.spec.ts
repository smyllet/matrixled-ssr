import DeviceCreated from '#events/device_created'
import DeviceDeleted from '#events/device_deleted'
import DeviceUpdated from '#events/device_updated'
import RendererCreated from '#events/renderer_created'
import RendererDeleted from '#events/renderer_deleted'
import RendererUpdated from '#events/renderer_updated'
import SceneCreated from '#events/scene_created'
import SceneDeleted from '#events/scene_deleted'
import SceneUpdated from '#events/scene_updated'
import BroadcastDashboardEvent from '#listeners/broadcast_dashboard_event'
import Device from '#models/device'
import Renderer from '#models/renderer'
import Scene from '#models/scene'
import type { BroadcastService, DashboardEventType } from '#services/broadcast_service'
import { test } from '@japa/runner'

class FakeBroadcastService {
  calls: [string, DashboardEventType, { id: string }][] = []

  toUser(userId: string, type: DashboardEventType, payload: { id: string }) {
    this.calls.push([userId, type, payload])
  }

  toPlatform(type: DashboardEventType, payload: { id: string }) {
    this.calls.push(['platform', type, payload])
  }
}

function listenerWithSpy() {
  const broadcast = new FakeBroadcastService()

  return {
    broadcast,
    listener: new BroadcastDashboardEvent(broadcast as unknown as BroadcastService),
  }
}

function device() {
  const record = new Device()
  record.id = 'device-1'
  record.userId = 'user-1'
  return record
}

function scene() {
  const record = new Scene()
  record.id = 'scene-1'
  record.userId = 'user-1'
  return record
}

function renderer(ownerId: string | null = 'user-1') {
  const record = new Renderer()
  record.id = 'renderer-1'
  record.ownerId = ownerId
  return record
}

test.group('Broadcast dashboard event listener', () => {
  test('forwards every event to its owner under the matching name', ({ assert }) => {
    const events = [
      new DeviceCreated(device()),
      new DeviceUpdated(device()),
      new DeviceDeleted(device()),
      new SceneCreated(scene()),
      new SceneUpdated(scene()),
      new SceneDeleted(scene()),
      new RendererCreated(renderer()),
      new RendererUpdated(renderer()),
      new RendererDeleted(renderer()),
    ]

    /**
     * Asserting the names one by one rather than trusting `event.name` on both
     * sides: a typo in a concrete event would otherwise compare equal to
     * itself and prove nothing.
     */
    const expected: DashboardEventType[] = [
      'device.created',
      'device.updated',
      'device.deleted',
      'scene.created',
      'scene.updated',
      'scene.deleted',
      'renderer.created',
      'renderer.updated',
      'renderer.deleted',
    ]

    const observed = events.map((event) => {
      const { broadcast, listener } = listenerWithSpy()

      listener.handle(event)

      assert.lengthOf(broadcast.calls, 1)
      assert.equal(broadcast.calls[0][0], 'user-1')
      assert.deepEqual(broadcast.calls[0][2], { id: event.id })

      return broadcast.calls[0][1]
    })

    assert.deepEqual(observed, expected)
  })

  /**
   * Not a private message to nobody: the ownerless renderer sits in every
   * user's list (`RendererService.getVisibleRenderers`), so its changes go to
   * the channel every dashboard listens on.
   */
  test('sends an ownerless renderer to the platform channel', ({ assert }) => {
    const { broadcast, listener } = listenerWithSpy()

    listener.handle(new RendererUpdated(renderer(null)))

    assert.deepEqual(broadcast.calls, [['platform', 'renderer.updated', { id: 'renderer-1' }]])
  })
})
