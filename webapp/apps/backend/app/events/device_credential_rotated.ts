import DeviceEvent from '#events/base/device_event'

/**
 * Its own event rather than `device.updated`: the renderer serving the device
 * has to learn the new prefix and hash and drop the connection that presented
 * the old token (docs/PROTOCOL-CONTROL.md § `device.credential_rotated`).
 */
export default class DeviceCredentialRotated extends DeviceEvent {
  readonly name = 'device.credential_rotated' as const
}
