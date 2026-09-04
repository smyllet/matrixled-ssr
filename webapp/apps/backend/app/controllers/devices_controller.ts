import DevicePolicy from '#policies/device_policy'
import { DeviceService } from '#services/device_service'
import DeviceTransformer from '#transformers/device_transformer'
import DeviceWithTokenTransformer from '#transformers/device_with_token_transformer'
import {
  createDeviceValidator,
  deleteDeviceValidator,
  patchDeviceValidator,
  showDeviceValidator,
} from '#validators/device'
import { inject } from '@adonisjs/core'
import { type HttpContext } from '@adonisjs/core/http'

@inject()
export default class DevicesController {
  constructor(protected deviceService: DeviceService) {}

  async index({ auth, serialize }: HttpContext) {
    const user = auth.getUserOrFail()

    const devices = await this.deviceService.getVisibleDevices(user.id)

    return serialize(DeviceTransformer.transform(devices))
  }

  async show({ request, serialize, bouncer }: HttpContext) {
    const {
      params: { id: deviceId },
    } = await request.validateUsing(showDeviceValidator)

    const device = await this.deviceService.getDeviceById(deviceId)

    await bouncer.with(DevicePolicy).authorize('show', device)

    return serialize(DeviceTransformer.transform(device))
  }

  async store({ auth, request, serialize, response }: HttpContext) {
    const payload = await request.validateUsing(createDeviceValidator)

    const user = auth.getUserOrFail()

    const { device, token } = await this.deviceService.createDevice({
      ...payload,
      userId: user.id,
    })

    return response.created(await serialize(DeviceWithTokenTransformer.transform(device, token)))
  }

  async patch({ request, serialize, bouncer }: HttpContext) {
    const {
      params: { id: deviceId },
      ...patch
    } = await request.validateUsing(patchDeviceValidator)

    const device = await this.deviceService.getDeviceById(deviceId)

    await bouncer.with(DevicePolicy).authorize('patch', device)

    const updatedDevice = await this.deviceService.patchDevice(device, patch)

    return serialize(DeviceTransformer.transform(updatedDevice))
  }

  async delete({ request, bouncer, response }: HttpContext) {
    const {
      params: { id: deviceId },
    } = await request.validateUsing(deleteDeviceValidator)

    const device = await this.deviceService.getDeviceById(deviceId)

    await bouncer.with(DevicePolicy).authorize('delete', device)

    await this.deviceService.deleteDevice(device)

    return response.noContent()
  }
}
