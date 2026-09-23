import { BaseTransformer } from '@adonisjs/core/transformers'
import type Device from '#models/device'

/**
 * Read by the firmware and the simulator rather than the dashboard, hence the
 * snake_case keys of docs/PROTOCOL-DEVICE.md § Bootstrap. Expects `renderer`
 * and `scene` to be loaded.
 */
export default class DeviceBootstrapTransformer extends BaseTransformer<Device> {
  toObject() {
    const { renderer, scene } = this.resource

    return {
      /**
       * As declared, and in declaration order: the client picks the transport
       * (docs/adr/0016-transports-declares-par-le-renderer.md). Empty until the
       * renderer has announced itself on the control plane.
       */
      renderer_urls: renderer.endpoints ?? [],
      panel: {
        width: this.resource.width,
        height: this.resource.height,
        chain: this.resource.chainLength,
      },
      /**
       * Null when no scene is assigned: a black screen, not an error.
       */
      scene_version: scene?.version ?? null,
    }
  }
}
