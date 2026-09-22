import DeviceEvent from '#events/base/device_event'

export default class DeviceCreated extends DeviceEvent {
  readonly name = 'device.created' as const
}
