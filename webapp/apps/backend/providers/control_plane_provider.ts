import { RendererConnections } from '#control_plane/renderer_connections'
import type { ApplicationService } from '@adonisjs/core/types'

/**
 * Holds the control plane's in-memory state for the life of the process. The
 * WebSocket endpoint itself is created with the Node server — `bin/server.ts`
 * and `tests/bootstrap.ts` — since a provider never sees it.
 *
 * Closing the connections at shutdown is not done here: providers shut down
 * after the HTTP server has closed, and that close waits for every open
 * WebSocket. `bin/server.ts` closes them in a terminating hook instead.
 */
export default class ControlPlaneProvider {
  constructor(protected app: ApplicationService) {}

  register() {
    this.app.container.singleton(RendererConnections, () => new RendererConnections())
  }
}
