import { BaseTransformer } from '@adonisjs/core/transformers'
import type Device from '#models/device'

/**
 * `tokenHash` is never exposed. `tokenPrefix` is, on purpose: it identifies a
 * credential in the interface or in a log without revealing it.
 */
export default class DeviceTransformer extends BaseTransformer<Device> {
  toObject() {
    return this.pick(this.resource, [
      'id',
      'name',
      'userId',
      'rendererId',
      'sceneId',
      'tokenPrefix',
      'panelType',
      'kind',
      'width',
      'height',
      'chainLength',
      'brightness',
      'maxFps',
      'offlineGrace',
      'firmwareVersion',
      'protocolVersion',
      'status',
      'lastSeenAt',
      'ipAddress',
      'createdAt',
      'updatedAt',
    ])
  }
}
