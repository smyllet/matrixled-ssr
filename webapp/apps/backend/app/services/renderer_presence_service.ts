import RendererUpdated from '#events/renderer_updated'
import Renderer from '#models/renderer'
import { DateTime } from 'luxon'

/**
 * `status` and `lastSeenAt` are observed, never submitted (docs/DATA-MODEL.md):
 * they follow the renderer's control connection, and this is the only code
 * that writes them.
 *
 * `lastSeenAt` is stamped when the connection opens, on every heartbeat it
 * answers, and when it closes: once the renderer is `offline`, it says since
 * when.
 */
export class RendererPresenceService {
  async markOnline(rendererId: string) {
    await this.#mark(rendererId, 'online')
  }

  async markOffline(rendererId: string) {
    await this.#mark(rendererId, 'offline')
  }

  /**
   * The renderer answered a heartbeat on its current connection: it is online,
   * and was seen now.
   */
  async markSeen(rendererId: string) {
    await this.#mark(rendererId, 'online')
  }

  /**
   * A process that has just started holds no connection, so any `online` left
   * in the table is what a crash forgot to undo. This assumes a single Adonis
   * instance: a second one would mark offline the renderers the first is
   * serving (docs/adr/0024-canal-de-controle-sur-le-serveur-http.md).
   */
  async resetAll() {
    await Renderer.query()
      .where('status', 'online')
      .update({ status: 'offline', last_seen_at: DateTime.now().toSQL() })
  }

  /**
   * Takes an id and reads the row afresh: the instance the handshake resolved
   * may have been renamed since, and a connection closed because its renderer
   * was deleted has no row left to mark.
   */
  async #mark(rendererId: string, status: 'online' | 'offline') {
    const renderer = await Renderer.find(rendererId)

    if (!renderer) return

    renderer.status = status
    renderer.lastSeenAt = DateTime.now()

    await renderer.save()

    RendererUpdated.dispatch(renderer)
  }
}
