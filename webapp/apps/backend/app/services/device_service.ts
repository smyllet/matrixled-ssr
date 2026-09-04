import {
  DEVICE_DEFAULT_BRIGHTNESS,
  DEVICE_DEFAULT_CHAIN_LENGTH,
  DEVICE_DEFAULT_OFFLINE_GRACE,
} from '#constants/device'
import DeviceCreated from '#events/device_created'
import DeviceDeleted from '#events/device_deleted'
import DeviceUpdated from '#events/device_updated'
import Device from '#models/device'
import Renderer from '#models/renderer'
import Scene from '#models/scene'
import { RendererService } from '#services/renderer_service'
import { TokenService } from '#services/token_service'
import { isDisplayable, type Geometry } from '#shared/geometry'
import { deviceGeometryValidator } from '#validators/device'
import { inject } from '@adonisjs/core'
import { errors } from '@vinejs/vine'

/**
 * The two enum defaults the `devices` migration already carries. Repeated here
 * so that a device created through the service is complete in memory rather
 * than only after a reload, exactly as `SceneService` does with its cadence.
 */
const DEFAULT_KIND = 'hardware' as const
const DEFAULT_PANEL_TYPE = 'hub75' as const

/**
 * Business refusals travel as validation errors so that a caller reads them in
 * the shape every other refusal comes in — a 422 with a `field` and a
 * `message` — rather than having to special-case the ones the request
 * validators cannot express.
 */
function refuse(field: string, rule: string, message: string): never {
  throw new errors.E_VALIDATION_ERROR([{ field, rule, message }])
}

@inject()
export class DeviceService {
  constructor(
    protected tokenService: TokenService,
    protected rendererService: RendererService
  ) {}

  async getVisibleDevices(userId: string) {
    return Device.query().where('user_id', userId).orderBy('created_at')
  }

  async getDeviceById(deviceId: string) {
    return Device.findOrFail(deviceId)
  }

  /**
   * Returns the clear token alongside the device: this is the only moment it
   * exists, and no endpoint can hand it out again afterwards.
   */
  async createDevice({
    name,
    width,
    height,
    chainLength,
    kind,
    panelType,
    brightness,
    maxFps,
    offlineGrace,
    rendererId,
    sceneId,
    userId,
  }: {
    name: string
    width: number
    height: number
    chainLength?: number
    kind?: 'hardware' | 'simulator'
    panelType?: 'hub75'
    brightness?: number
    maxFps?: number | null
    offlineGrace?: number | null
    rendererId?: string
    sceneId?: string | null
    userId: string
  }) {
    const renderer = await this.resolveRenderer(rendererId, userId)

    if (sceneId) {
      await this.resolveDisplayableScene(sceneId, userId, { width, height })
    }

    const credential = await this.tokenService.issue('device')

    const device = await Device.create({
      name,
      width,
      height,
      userId,
      rendererId: renderer.id,
      sceneId: sceneId ?? null,
      tokenPrefix: credential.prefix,
      tokenHash: credential.hash,
      chainLength: chainLength ?? DEVICE_DEFAULT_CHAIN_LENGTH,
      brightness: brightness ?? DEVICE_DEFAULT_BRIGHTNESS,
      maxFps: maxFps ?? null,
      offlineGrace: offlineGrace === undefined ? DEVICE_DEFAULT_OFFLINE_GRACE : offlineGrace,
      kind: kind ?? DEFAULT_KIND,
      panelType: panelType ?? DEFAULT_PANEL_TYPE,
    })

    /**
     * `status` is a database default, so the fresh instance does not carry it.
     * Reload so the response describes the stored row.
     */
    await device.refresh()

    DeviceCreated.dispatch(device)

    return { device, token: credential.token }
  }

  async patchDevice(
    device: Device,
    patch: Partial<{
      name: string
      width: number
      height: number
      chainLength: number
      brightness: number
      maxFps: number | null
      offlineGrace: number | null
      rendererId: string
      sceneId: string | null
    }>
  ) {
    const geometry = {
      width: patch.width ?? device.width,
      height: patch.height ?? device.height,
    }

    /**
     * A patch touching only one of the two dimensions can't be checked by the
     * request validator, which never sees the sibling value still in the row.
     */
    if (patch.width !== undefined || patch.height !== undefined) {
      await deviceGeometryValidator.validate(geometry)
    }

    const sceneId = patch.sceneId === undefined ? device.sceneId : patch.sceneId

    /**
     * Both halves of the pair are re-checked against their merged values, and
     * a geometry that would invalidate the scene already assigned is refused
     * rather than silently unassigned: an incompatible pair never reaches the
     * database, and the caller who wants the new geometry says what becomes of
     * the scene (docs/DATA-MODEL.md § Scene).
     */
    if (sceneId) {
      await this.resolveDisplayableScene(sceneId, device.userId, geometry)
    }

    if (patch.rendererId !== undefined) {
      const renderer = await this.resolveRenderer(patch.rendererId, device.userId)

      device.rendererId = renderer.id
    }

    device.name = patch.name ?? device.name
    device.width = geometry.width
    device.height = geometry.height
    device.chainLength = patch.chainLength ?? device.chainLength
    device.brightness = patch.brightness ?? device.brightness
    device.maxFps = patch.maxFps === undefined ? device.maxFps : patch.maxFps
    device.offlineGrace =
      patch.offlineGrace === undefined ? device.offlineGrace : patch.offlineGrace
    device.sceneId = sceneId

    /**
     * Read before `save()`, which resets the tracking. A client resubmitting an
     * unchanged form — the edit sheet does — must not wake every open tab for a
     * refetch that would return the row it already holds.
     */
    const modified = device.$isDirty

    await device.save()

    if (modified) {
      DeviceUpdated.dispatch(device)
    }

    return device
  }

  async deleteDevice(device: Device) {
    await device.delete()

    DeviceDeleted.dispatch(device)
  }

  /**
   * A device is served by its owner's renderer or by the platform one, and by
   * nothing else: a third party's renderer would see frames its owner has no
   * business seeing (docs/DATA-MODEL.md § Device).
   */
  private async resolveRenderer(rendererId: string | undefined, userId: string) {
    if (rendererId === undefined) {
      return this.rendererService.getDefaultRenderer()
    }

    /**
     * Read through the model rather than `RendererService.getRendererById`,
     * which raises a 404: a renderer the caller may not use and one that does
     * not exist are the same refusal here, and it belongs with the other
     * refusals of this request rather than in a status of its own.
     */
    const renderer = await Renderer.find(rendererId)

    if (!renderer || (!renderer.isPlatformRenderer && renderer.ownerId !== userId)) {
      refuse('rendererId', 'exists', 'The selected renderer does not exist')
    }

    return renderer
  }

  private async resolveDisplayableScene(sceneId: string, userId: string, geometry: Geometry) {
    const scene = await Scene.find(sceneId)

    if (!scene || scene.userId !== userId) {
      refuse('sceneId', 'exists', 'The selected scene does not exist')
    }

    if (!isDisplayable(geometry, scene)) {
      refuse(
        'sceneId',
        'displayableScene',
        `The device geometry (${geometry.width}x${geometry.height}) is not an integer multiple of the scene geometry (${scene.width}x${scene.height})`
      )
    }

    return scene
  }
}
