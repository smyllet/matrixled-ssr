import {
  DEVICE_MAXIMUM_BRIGHTNESS,
  DEVICE_MAXIMUM_MAX_FPS,
  DEVICE_MINIMUM_BRIGHTNESS,
  DEVICE_MINIMUM_MAX_FPS,
} from '#constants/device'
import { boundedByProtocolMaximum } from '#validators/geometry'
import vine from '@vinejs/vine'

/**
 * `status`, `lastSeenAt`, `ipAddress`, `firmwareVersion` and `protocolVersion`
 * are observed — declared by the device on the control plane or derived from
 * its connection. None of them is accepted from an HTTP request. See
 * docs/DATA-MODEL.md.
 *
 * Every reusable piece here is a factory: a schema instance carries the rules
 * applied to it, so sharing one across validators shares state that is meant
 * to be per-validator.
 */
const name = () => vine.string().minLength(3).maxLength(100)
const dimension = () => vine.number().positive().withoutDecimals()
const chainLength = () => vine.number().positive().withoutDecimals()
const brightness = () =>
  vine.number().min(DEVICE_MINIMUM_BRIGHTNESS).max(DEVICE_MAXIMUM_BRIGHTNESS).withoutDecimals()

/**
 * `null` is a value here, not an absence: no emission cap
 * (docs/adr/0019-cadence-portee-par-la-scene.md).
 */
const maxFps = () =>
  vine.number().min(DEVICE_MINIMUM_MAX_FPS).max(DEVICE_MAXIMUM_MAX_FPS).withoutDecimals().nullable()

/**
 * `null` is a value here too: a lease that never expires
 * (docs/adr/0015-bail-de-session-device.md).
 */
const offlineGrace = () => vine.number().positive().withoutDecimals().nullable()

/**
 * `null` unassigns the scene, which is a black screen rather than an error.
 * Whether the pair is displayable at all is DeviceService's call: it needs
 * both rows, which a request validator never has.
 */
const sceneId = () => vine.string().uuid().nullable()

const rendererId = () => vine.string().uuid()

/**
 * Chosen at creation and never edited afterwards
 * (docs/adr/0020-simulateur-device-declare.md), hence absent from the patch
 * validator below — as is `panelType`, whose single value has nothing to move
 * to yet (docs/adr/0005-hub75-dabord.md).
 */
const kind = () => vine.enum(['hardware', 'simulator'] as const)
const panelType = () => vine.enum(['hub75'] as const)

/**
 * Pre-compiled once: `vine.validate({ schema })` rebuilds the validation
 * function on every call, and DeviceService re-runs this on every geometry
 * patch, against the merged width and height the request validator cannot see.
 */
export const deviceGeometryValidator = vine.create(
  vine
    .object({
      width: dimension(),
      height: dimension(),
    })
    .use(boundedByProtocolMaximum())
)

export const showDeviceValidator = vine.create({
  params: vine.object({
    id: vine.string().uuid(),
  }),
})

export const createDeviceValidator = vine.create(
  vine
    .object({
      name: name(),
      width: dimension(),
      height: dimension(),
      chainLength: chainLength().optional(),
      kind: kind().optional(),
      panelType: panelType().optional(),
      brightness: brightness().optional(),
      maxFps: maxFps().optional(),
      offlineGrace: offlineGrace().optional(),
      rendererId: rendererId().optional(),
      sceneId: sceneId().optional(),
    })
    .use(boundedByProtocolMaximum())
)

export const patchDeviceValidator = vine.create({
  params: vine.object({
    id: vine.string().uuid(),
  }),
  name: name().optional(),
  width: dimension().optional(),
  height: dimension().optional(),
  chainLength: chainLength().optional(),
  brightness: brightness().optional(),
  maxFps: maxFps().optional(),
  offlineGrace: offlineGrace().optional(),
  rendererId: rendererId().optional(),
  sceneId: sceneId().optional(),
})

export const deleteDeviceValidator = vine.create({
  params: vine.object({
    id: vine.string().uuid(),
  }),
})
