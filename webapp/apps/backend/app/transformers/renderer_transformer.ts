import { BaseTransformer } from '@adonisjs/core/transformers'
import type Renderer from '#models/renderer'

/**
 * `tokenHash` is never exposed. `tokenPrefix` is, on purpose: it identifies a
 * credential in the interface or in a log without revealing it.
 */
export default class RendererTransformer extends BaseTransformer<Renderer> {
  toObject() {
    return this.pick(this.resource, [
      'id',
      'name',
      'ownerId',
      'isDefault',
      'tokenPrefix',
      'version',
      'capabilities',
      'endpoint',
      'status',
      'lastSeenAt',
      'createdAt',
      'updatedAt',
    ])
  }
}
