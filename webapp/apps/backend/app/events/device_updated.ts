import DeviceEvent from '#events/base/device_event'

export default class DeviceUpdated extends DeviceEvent {
  readonly name = 'device.updated' as const
}
