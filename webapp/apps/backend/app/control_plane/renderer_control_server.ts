import {
  CONTROL_CLOSE,
  CONTROL_HEARTBEAT_INTERVAL_MS,
  CONTROL_MAXIMUM_PAYLOAD,
  CONTROL_PATH,
  CONTROL_SHUTDOWN_GRACE_MS,
} from '#constants/control'
import { RendererConnections } from '#control_plane/renderer_connections'
import { rendererCredentials } from '#guards/credentials'
import { verifyBearerToken } from '#guards/token_guard'
import type Renderer from '#models/renderer'
import { RendererPresenceService } from '#services/renderer_presence_service'
import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import { createServer, STATUS_CODES, type IncomingMessage, type RequestListener } from 'node:http'
import type { Duplex } from 'node:stream'
import { WebSocketServer, type WebSocket } from 'ws'

export interface RendererControlOptions {
  heartbeatIntervalMs?: number
}

export interface RendererControl {
  /**
   * Settles once the presence reset of a fresh process has run.
   */
  ready: Promise<void>
  /**
   * Settles once no presence write is pending. A write runs off the request
   * path, after the connection event that queued it.
   */
  idle(): Promise<void>
  /**
   * Closes every control connection with `1001` and waits for their presence
   * to be written. Must run before the HTTP server closes: Node's
   * `server.close()` waits for upgraded sockets too, and a healthy renderer
   * never closes its own.
   */
  close(): Promise<void>
}

function pathOf(request: IncomingMessage) {
  return new URL(request.url ?? '/', 'http://localhost').pathname
}

const REFUSALS = {
  401: 'Unauthorized access',
  404: 'Not found',
  503: 'Shutting down',
} as const

/**
 * Answers an upgrade request with a plain HTTP error and hangs up: no `101` is
 * ever sent to a client that is not let in. The body has the shape every other
 * API error has.
 */
function refuse(socket: Duplex, status: keyof typeof REFUSALS) {
  const body = JSON.stringify({ errors: [{ message: REFUSALS[status] }] })

  socket.end(
    `HTTP/1.1 ${status} ${STATUS_CODES[status]}\r\n` +
      'Connection: close\r\n' +
      'Content-Type: application/json; charset=utf-8\r\n' +
      `Content-Length: ${Buffer.byteLength(body)}\r\n` +
      '\r\n' +
      body
  )
}

/**
 * Serves the control plane on the Node server Adonis listens with: a renderer
 * dials out to `wss://<platform>/api/v1/renderer/control` and holds the
 * connection open, and the platform never connects to a renderer
 * (docs/PROTOCOL-CONTROL.md, docs/adr/0024-canal-de-controle-sur-le-serveur-http.md).
 *
 * Only an upgrade on the control path is diverted. Any other request, an
 * `Upgrade: h2c` on an API route included, reaches the Adonis router as plain
 * HTTP.
 *
 * Called by `bin/server.ts` and `tests/bootstrap.ts`, which create the server.
 * The message catalogue is #27: until then, whatever a renderer sends is
 * logged and ignored.
 */
export function createServerWithRendererControl(
  handler: RequestListener,
  { heartbeatIntervalMs = CONTROL_HEARTBEAT_INTERVAL_MS }: RendererControlOptions = {}
) {
  const httpServer = createServer(
    { shouldUpgradeCallback: (request) => pathOf(request) === CONTROL_PATH },
    handler
  )

  const wss = new WebSocketServer({ noServer: true, maxPayload: CONTROL_MAXIMUM_PAYLOAD })

  /**
   * Awaited before any renderer is let in: the server factory calling this is
   * synchronous, and the presence reset must have settled first, or a
   * connection accepted during it would be marked offline right after.
   */
  const ready = (async () => {
    const connections = await app.container.make(RendererConnections)
    const presence = await app.container.make(RendererPresenceService)

    await presence.resetAll().catch((error) => {
      logger.error({ err: error }, 'Could not reset renderer presence')
    })

    return { connections, presence }
  })()

  /**
   * Nothing may await `ready` before the first renderer dials in, and a
   * rejection nobody awaits would take the process down. Each handshake still
   * awaits it and fails on its own.
   */
  ready.catch((error) => logger.error({ err: error }, 'Control plane failed to start'))

  type Services = Awaited<typeof ready>

  /**
   * Presence writes for one renderer run in the order their connections opened
   * and closed. Left concurrent, the `offline` of a connection that just closed
   * could land after the `online` of the one replacing it.
   */
  const writes = new Map<string, Promise<void>>()

  function record(
    { connections, presence }: Services,
    rendererId: string,
    socket: WebSocket,
    change: 'online' | 'seen' | 'offline'
  ) {
    const previous = writes.get(rendererId) ?? Promise.resolve()

    const next = previous
      .then(() => {
        /**
         * Read when the write runs, not when it was queued: a renderer that
         * reconnected meanwhile is online, whatever its old connection says,
         * and a pong answered by a connection since closed or superseded
         * must not stamp a renderer its successor — or nobody — is serving.
         */
        if (change === 'offline' && connections.has(rendererId)) return
        if (change === 'seen' && !connections.isCurrent(rendererId, socket)) return

        if (change === 'online') return presence.markOnline(rendererId)
        if (change === 'seen') return presence.markSeen(rendererId)
        return presence.markOffline(rendererId)
      })
      .catch((error) => {
        logger.error({ err: error, rendererId }, `Could not record renderer presence: ${change}`)
      })
      .finally(() => {
        if (writes.get(rendererId) === next) writes.delete(rendererId)
      })

    writes.set(rendererId, next)
  }

  /**
   * Checks started off a connection event and not tracked by `writes`, which
   * `idle()` must wait for all the same.
   */
  const checks = new Set<Promise<void>>()

  function track(check: Promise<void>) {
    checks.add(check)
    check.finally(() => checks.delete(check)).catch(() => {})
  }

  /**
   * Set when `close()` starts. From then on no renderer is let in: a
   * connection accepted after the sockets were collected for closing would
   * never be closed, and Node's `server.close()` would wait for it forever.
   */
  let closing = false

  const alive = new WeakSet<WebSocket>()

  const heartbeat = setInterval(() => {
    for (const socket of wss.clients) {
      if (!alive.has(socket)) {
        socket.terminate()
        continue
      }

      alive.delete(socket)
      socket.ping()
    }
  }, heartbeatIntervalMs)

  /**
   * The heartbeat serves connections; it must not be what keeps a process
   * alive once there is nothing else to do.
   */
  heartbeat.unref()

  /**
   * The credential this connection authenticated with may have been rotated,
   * or its renderer deleted, while the handshake was hashing it: the revocation
   * then found no connection to close. Checked once the connection is
   * registered, so that a revocation landing any later finds it instead.
   */
  async function closeIfRevoked(renderer: Renderer, socket: WebSocket) {
    const current = await rendererCredentials.findByPrefix(renderer.tokenPrefix)

    if (current?.id !== renderer.id) {
      socket.close(CONTROL_CLOSE.revoked, 'credential revoked')
    }
  }

  function accept(services: Services, renderer: Renderer, socket: WebSocket) {
    const { connections } = services

    alive.add(socket)
    connections.add(renderer.id, socket, CONTROL_CLOSE.superseded)

    socket.on('pong', () => {
      alive.add(socket)
      record(services, renderer.id, socket, 'seen')
    })

    socket.on('message', (_data, isBinary) => {
      logger.debug({ rendererId: renderer.id, isBinary }, 'Ignored a control-plane message')
    })

    socket.on('error', (error) => {
      logger.warn({ err: error, rendererId: renderer.id }, 'Control connection failed')
    })

    socket.on('close', () => {
      if (connections.remove(renderer.id, socket)) record(services, renderer.id, socket, 'offline')
    })

    record(services, renderer.id, socket, 'online')

    track(
      closeIfRevoked(renderer, socket).catch((error) => {
        logger.error({ err: error, rendererId: renderer.id }, 'Could not recheck a credential')
        socket.close(CONTROL_CLOSE.internalError, 'credential check failed')
      })
    )
  }

  async function handleUpgrade(request: IncomingMessage, socket: Duplex, head: Buffer) {
    /**
     * `shouldUpgradeCallback` already keeps other paths out. Checked again
     * because a Node that predates the option ignores it silently, and would
     * then turn an upgrade on any path into a control handshake.
     */
    if (pathOf(request) !== CONTROL_PATH) return refuse(socket, 404)
    if (closing) return refuse(socket, 503)

    const services = await ready
    const renderer = await verifyBearerToken(request.headers.authorization, rendererCredentials)

    if (!renderer) return refuse(socket, 401)

    /**
     * The hashing above takes long enough for a shutdown to have started.
     */
    if (closing) return refuse(socket, 503)

    wss.handleUpgrade(request, socket, head, (ws) => accept(services, renderer, ws))
  }

  httpServer.on('upgrade', (request, socket, head) => {
    socket.on('error', () => socket.destroy())

    handleUpgrade(request, socket, head).catch((error) => {
      logger.error({ err: error }, 'Control-plane handshake failed')
      socket.destroy()
    })
  })

  const control: RendererControl = {
    ready: ready.then(
      () => {},
      () => {}
    ),

    async idle() {
      while (writes.size > 0 || checks.size > 0) {
        await Promise.allSettled([...writes.values(), ...checks])
      }
    },

    async close() {
      closing = true
      clearInterval(heartbeat)

      /**
       * Stops `wss` from completing any further upgrade — it answers `503` —
       * without touching the connections it already holds.
       */
      wss.close()

      const closed = [...wss.clients].map((socket) => {
        /**
         * Resolved on `close` only: an `error` emitted during the closing
         * handshake must not reject, or it would abort the terminating hooks
         * after this one, the database's shutdown included.
         */
        const done = new Promise<void>((resolve) => socket.once('close', () => resolve()))

        socket.close(CONTROL_CLOSE.goingAway, 'shutting down')

        /**
         * A renderer that does not answer the closing handshake is not waited
         * for: the process is stopping either way.
         */
        const timeout = setTimeout(() => socket.terminate(), CONTROL_SHUTDOWN_GRACE_MS)

        return done.finally(() => clearTimeout(timeout))
      })

      await Promise.all(closed)

      /**
       * The `offline` of each closed connection is queued by its close
       * handler. Waiting for it here keeps the rows truthful: the database is
       * only closed after the terminating hooks, by the Lucid provider.
       */
      await control.idle()
    },
  }

  return { server: httpServer, control }
}
