import type Device from '#models/device'
import DeviceTransformer from '#transformers/device_transformer'

/**
 * Used by the one endpoint that mints a credential — pairing — and by nothing
 * else. The clear token is shown once and cannot be read back.
 */
export default class DeviceWithTokenTransformer extends DeviceTransformer {
  constructor(
    resource: Device,
    protected token: string
  ) {
    super(resource)
  }

  override toObject() {
    return {
      ...super.toObject(),
      token: this.token,
    }
  }
}
