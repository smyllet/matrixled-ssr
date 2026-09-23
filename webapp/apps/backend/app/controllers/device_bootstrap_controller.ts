import { DeviceService } from '#services/device_service'
import DeviceBootstrapTransformer from '#transformers/device_bootstrap_transformer'
import { inject } from '@adonisjs/core'
import { type HttpContext } from '@adonisjs/core/http'

@inject()
export default class DeviceBootstrapController {
  constructor(protected deviceService: DeviceService) {}

  async show({ auth, serialize }: HttpContext) {
    const device = auth.use('device').getUserOrFail()

    await this.deviceService.loadRendererAndScene(device)

    return serialize(DeviceBootstrapTransformer.transform(device))
  }
}
