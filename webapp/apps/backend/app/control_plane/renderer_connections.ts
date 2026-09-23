import type { WebSocket } from 'ws'

/**
 * The live control connections, one per renderer at most. Held in memory,
 * which is why the platform runs a single Adonis instance
 * (docs/adr/0024-canal-de-controle-sur-le-serveur-http.md).
 *
 * Bound as a singleton by `providers/control_plane_provider.ts`: the upgrade
 * handler adds to it, and the renderer service reaches into it to revoke.
 */
export class RendererConnections {
  #sockets = new Map<string, WebSocket>()

  /**
   * The newest connection wins. Refusing it instead would lock a restarted
   * renderer out until the heartbeat noticed its previous connection was dead.
   */
  add(rendererId: string, socket: WebSocket, supersededCode: number) {
    const previous = this.#sockets.get(rendererId)

    this.#sockets.set(rendererId, socket)

    previous?.close(supersededCode, 'superseded')
  }

  /**
   * Forgets `socket` if it still is the renderer's current connection, and says
   * whether it was. A superseded connection closing must not mark offline a
   * renderer its successor is serving.
   */
  remove(rendererId: string, socket: WebSocket) {
    if (this.#sockets.get(rendererId) !== socket) return false

    this.#sockets.delete(rendererId)

    return true
  }

  has(rendererId: string) {
    return this.#sockets.has(rendererId)
  }

  isCurrent(rendererId: string, socket: WebSocket) {
    return this.#sockets.get(rendererId) === socket
  }

  disconnect(rendererId: string, code: number, reason: string) {
    this.#sockets.get(rendererId)?.close(code, reason)
  }
}
