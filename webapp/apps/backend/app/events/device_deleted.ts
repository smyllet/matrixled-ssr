import DeviceEvent from '#events/base/device_event'

export default class DeviceDeleted extends DeviceEvent {
  readonly name = 'device.deleted' as const
}
