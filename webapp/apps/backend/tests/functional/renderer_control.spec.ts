import { CONTROL_CLOSE, CONTROL_PATH } from '#constants/control'
import { createServerWithRendererControl } from '#control_plane/renderer_control_server'
import { RendererConnections } from '#control_plane/renderer_connections'
import { rendererCredentials } from '#guards/credentials'
import RendererUpdated from '#events/renderer_updated'
import Renderer from '#models/renderer'
import { DeviceService } from '#services/device_service'
import { RendererPresenceService } from '#services/renderer_presence_service'
import { RendererService } from '#services/renderer_service'
import { createUser, platformRenderer } from '#tests/helpers'
import app from '@adonisjs/core/services/app'
import emitter from '@adonisjs/core/services/emitter'
import server from '@adonisjs/core/services/server'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { once } from 'node:events'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { WebSocket, type ClientOptions } from 'ws'

function controlUrl(httpServer: Server = server.getNodeServer()!) {
  const { address, family, port } = httpServer.address() as AddressInfo
  const host = family === 'IPv6' ? `[${address}]` : address

  return `ws://${host}:${port}${CONTROL_PATH}`
}

/**
 * Resolves with the open socket, or rejects with the HTTP status the handshake
 * was refused with.
 */
function connect(token: string | null, options: ClientOptions & { url?: string } = {}) {
  const { url = controlUrl(), ...clientOptions } = options
  const headers: Record<string, string> = token ? { authorization: `Bearer ${token}` } : {}
  const socket = new WebSocket(url, { ...clientOptions, headers })

  return new Promise<WebSocket>((resolve, reject) => {
    socket.once('open', () => resolve(socket))
    socket.once('unexpected-response', (request, response) => {
      request.destroy()
      reject(Object.assign(new Error('Handshake refused'), { status: response.statusCode }))
    })
    socket.once('error', reject)
  })
}

async function refusalStatus(attempt: Promise<WebSocket>) {
  try {
    const socket = await attempt
    socket.close()
    return 101
  } catch (error) {
    return (error as { status?: number }).status
  }
}

async function closeCode(socket: WebSocket) {
  const [code] = (await once(socket, 'close')) as [number]
  return code
}

/**
 * Presence is written after the handshake, off the request path, so a test
 * polls for the row to settle rather than reading it once.
 */
async function eventually(check: () => Promise<boolean>, timeoutMs = 2000) {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    if (await check()) return
    await new Promise((resolve) => setTimeout(resolve, 20))
  }

  throw new Error('Condition not met in time')
}

function stored(rendererId: string) {
  return Renderer.findOrFail(rendererId)
}

function statusIs(rendererId: string, status: 'online' | 'offline') {
  return async () => {
    const renderer = await stored(rendererId)
    return renderer.status === status
  }
}

/**
 * Closes a connection and waits for its `offline` to land, so that no presence
 * write is still in flight when the next test truncates the tables.
 */
function leave(socket: WebSocket, rendererId: string) {
  return async () => {
    socket.close()
    await eventually(statusIs(rendererId, 'offline'))
  }
}

/**
 * A second control server on an ephemeral port, for the tests that need their
 * own heartbeat or their own shutdown.
 */
async function startControlServer(options: { heartbeatIntervalMs?: number } = {}) {
  const { server: httpServer, control } = createServerWithRendererControl(
    (_request, response) => response.end(),
    options
  )

  httpServer.listen(0, '127.0.0.1')
  await once(httpServer, 'listening')
  await control.ready

  const closeHttp = () => new Promise<void>((resolve) => httpServer.close(() => resolve()))

  const stop = async () => {
    await control.close()
    await closeHttp()
  }

  return { url: controlUrl(httpServer), control, stop, closeHttp }
}

async function issueRendererToken() {
  const rendererService = await app.container.make(RendererService)

  return rendererService.rotateToken(await platformRenderer())
}

test.group('Renderer control channel', () => {
  test('accepts a renderer token and marks the renderer online', async ({ assert, cleanup }) => {
    const { renderer, token } = await issueRendererToken()
    const before = await stored(renderer.id)
    assert.isNull(before.lastSeenAt)

    const socket = await connect(token)
    cleanup(leave(socket, renderer.id))

    await eventually(statusIs(renderer.id, 'online'))

    const after = await stored(renderer.id)
    assert.isNotNull(after.lastSeenAt)
  })

  test('refuses a missing, wrong or device token at the handshake', async ({ assert }) => {
    const { renderer, token } = await issueRendererToken()

    const user = await createUser()
    const deviceService = await app.container.make(DeviceService)
    const { token: deviceToken } = await deviceService.createDevice({
      name: 'Kitchen panel',
      width: 64,
      height: 32,
      userId: user.id,
    })

    assert.equal(await refusalStatus(connect(null)), 401)
    assert.equal(await refusalStatus(connect(`${token}x`)), 401)
    assert.equal(await refusalStatus(connect('not-a-token')), 401)
    assert.equal(await refusalStatus(connect(deviceToken)), 401)

    const after = await stored(renderer.id)
    assert.equal(after.status, 'offline')
  })

  test('leaves an upgrade on any other path to the router', async ({ assert }) => {
    await platformRenderer()
    const user = await createUser()
    const deviceService = await app.container.make(DeviceService)
    const { token } = await deviceService.createDevice({
      name: 'Kitchen panel',
      width: 64,
      height: 32,
      userId: user.id,
    })

    /**
     * The bootstrap answers 200 to a device token: reaching it proves the
     * request went through the Adonis router as plain HTTP.
     */
    const url = controlUrl().replace(CONTROL_PATH, '/api/v1/device/bootstrap')

    assert.equal(await refusalStatus(connect(token, { url })), 200)
  })

  test('marks the renderer offline when the connection drops', async ({ assert }) => {
    const { renderer, token } = await issueRendererToken()

    const socket = await connect(token)
    await eventually(statusIs(renderer.id, 'online'))
    const connected = await stored(renderer.id)

    socket.close()
    await eventually(statusIs(renderer.id, 'offline'))

    const disconnected = await stored(renderer.id)
    assert.isTrue(disconnected.lastSeenAt! >= connected.lastSeenAt!)
  })

  test('lets a newer connection supersede the previous one', async ({ assert }) => {
    const { renderer, token } = await issueRendererToken()

    const first = await connect(token)
    await eventually(statusIs(renderer.id, 'online'))

    using fakeEmitter = emitter.fake()

    const firstClosed = closeCode(first)
    const second = await connect(token)

    assert.equal(await firstClosed, CONTROL_CLOSE.superseded)

    /**
     * Presence writes for one renderer are serialized, so once the second
     * connection's own `offline` has landed, anything the superseded one
     * queued has landed before it. Exactly one `offline` proves the first
     * close wrote nothing.
     */
    second.close()
    await eventually(statusIs(renderer.id, 'offline'))

    const offline = fakeEmitter
      .all()
      .filter(
        ({ event, data }) =>
          event === RendererUpdated &&
          (data as RendererUpdated).id === renderer.id &&
          (data as RendererUpdated).renderer.status === 'offline'
      )

    assert.lengthOf(offline, 1)
  })

  test('closes the connection when its token is rotated', async ({ assert, cleanup }) => {
    const { renderer, token } = await issueRendererToken()

    const socket = await connect(token)
    await eventually(statusIs(renderer.id, 'online'))

    const closed = closeCode(socket)
    const rendererService = await app.container.make(RendererService)
    const { token: freshToken } = await rendererService.rotateToken(renderer)

    assert.equal(await closed, CONTROL_CLOSE.revoked)
    await eventually(statusIs(renderer.id, 'offline'))

    assert.equal(await refusalStatus(connect(token)), 401)

    const reconnected = await connect(freshToken)
    cleanup(leave(reconnected, renderer.id))
    await eventually(statusIs(renderer.id, 'online'))
  })

  test('closes the connection when its renderer is deleted', async ({ assert }) => {
    const user = await createUser()
    const rendererService = await app.container.make(RendererService)
    const { renderer, token } = await rendererService.createRenderer({
      name: 'Garage',
      ownerId: user.id,
    })

    const socket = await connect(token)
    await eventually(statusIs(renderer.id, 'online'))

    const closed = closeCode(socket)
    await rendererService.deleteRenderer(renderer)

    assert.equal(await closed, CONTROL_CLOSE.revoked)

    /**
     * The client sees the close before the server has handled it. Nothing is
     * left to assert in the database — the row is gone — but the server's own
     * close must have run, or its presence write would outlive the test.
     */
    const connections = await app.container.make(RendererConnections)
    await eventually(async () => !connections.has(renderer.id))
  })

  test('stamps lastSeenAt on every heartbeat answered', async ({ assert, cleanup }) => {
    const { renderer, token } = await issueRendererToken()
    const { url, stop } = await startControlServer({ heartbeatIntervalMs: 50 })
    cleanup(stop)

    const socket = await connect(token, { url })
    await eventually(statusIs(renderer.id, 'online'))
    const connected = await stored(renderer.id)

    using fakeEmitter = emitter.fake()

    await eventually(async () => {
      const current = await stored(renderer.id)
      return current.lastSeenAt!.toMillis() > connected.lastSeenAt!.toMillis()
    })

    const current = await stored(renderer.id)
    assert.equal(current.status, 'online')

    /**
     * Each stamp is announced, so that the dashboard's « last seen » follows.
     */
    fakeEmitter.assertEmitted(
      RendererUpdated,
      ({ data }) => data.id === renderer.id && data.renderer.status === 'online'
    )

    socket.close()
    await eventually(statusIs(renderer.id, 'offline'))
  })

  test('cuts a connection that stops answering pings', async ({ cleanup }) => {
    const { renderer, token } = await issueRendererToken()

    const { url, stop } = await startControlServer({ heartbeatIntervalMs: 50 })
    cleanup(stop)

    const socket = await connect(token, { url, autoPong: false })
    await eventually(statusIs(renderer.id, 'online'))

    await closeCode(socket)
    await eventually(statusIs(renderer.id, 'offline'))
  })

  test('closes a connection whose token is revoked during its handshake', async ({ assert }) => {
    const { renderer, token } = await issueRendererToken()
    const rendererService = await app.container.make(RendererService)
    const findByPrefix = rendererCredentials.findByPrefix

    /**
     * The handshake resolves the prefix, then hashes. Rotating right after the
     * lookup reproduces a rotation landing while it hashes: the row in hand
     * still carries the old credential, and no connection exists yet for the
     * rotation to close.
     */
    rendererCredentials.findByPrefix = async (prefix) => {
      rendererCredentials.findByPrefix = findByPrefix
      const row = await findByPrefix(prefix)
      await rendererService.rotateToken(await Renderer.findOrFail(renderer.id))
      return row
    }

    try {
      const socket = await connect(token)
      assert.equal(await closeCode(socket), CONTROL_CLOSE.revoked)
    } finally {
      rendererCredentials.findByPrefix = findByPrefix
    }

    await eventually(statusIs(renderer.id, 'offline'))
  })

  test('closes as a server error when the credential cannot be rechecked', async ({ assert }) => {
    const { renderer, token } = await issueRendererToken()
    const findByPrefix = rendererCredentials.findByPrefix

    /**
     * The handshake's own lookup succeeds; the recheck that follows it fails,
     * as it would on a database hiccup. The token is still valid, so the
     * renderer must be told to retry, not that its credential is gone.
     */
    rendererCredentials.findByPrefix = async (prefix) => {
      rendererCredentials.findByPrefix = async () => {
        throw new Error('database unavailable')
      }
      return findByPrefix(prefix)
    }

    try {
      const socket = await connect(token)
      assert.equal(await closeCode(socket), CONTROL_CLOSE.internalError)
    } finally {
      rendererCredentials.findByPrefix = findByPrefix
    }

    await eventually(statusIs(renderer.id, 'offline'))
  })

  test('closes every connection at shutdown, and records it', async ({ assert }) => {
    const { renderer, token } = await issueRendererToken()
    const { url, stop } = await startControlServer()

    const socket = await connect(token, { url })
    await eventually(statusIs(renderer.id, 'online'))

    const closed = closeCode(socket)
    await stop()

    assert.equal(await closed, CONTROL_CLOSE.goingAway)

    /**
     * No polling: `close()` resolves only once the presence is written.
     */
    const after = await stored(renderer.id)
    assert.equal(after.status, 'offline')
  })

  test('lets no renderer in once shutdown has started', async ({ assert }) => {
    const { renderer, token } = await issueRendererToken()
    const { url, control, closeHttp } = await startControlServer()

    const socket = await connect(token, { url })
    await eventually(statusIs(renderer.id, 'online'))

    /**
     * A renderer told `1001` reconnects straight away. Were it let back in,
     * it would never be closed, and the HTTP server would wait for it forever.
     */
    let reconnection: Promise<number | undefined> | undefined
    socket.once('close', () => {
      reconnection = refusalStatus(connect(token, { url }))
    })

    /**
     * The HTTP server stays up until the reconnection has been answered: once
     * it stops listening, the attempt would be refused by the kernel, not by
     * the control plane, and the test would prove nothing.
     */
    await control.close()
    assert.equal(await reconnection, 503)
    await closeHttp()
    const after = await stored(renderer.id)
    assert.equal(after.status, 'offline')
  })

  test('announces each presence change to the dashboard', async () => {
    const { renderer, token } = await issueRendererToken()

    using fakeEmitter = emitter.fake()

    const socket = await connect(token)
    await eventually(async () => fakeEmitter.exists(RendererUpdated))

    fakeEmitter.assertEmitted(
      RendererUpdated,
      ({ data }) => data.id === renderer.id && data.renderer.status === 'online'
    )

    socket.close()
    await eventually(statusIs(renderer.id, 'offline'))

    fakeEmitter.assertEmitted(
      RendererUpdated,
      ({ data }) => data.id === renderer.id && data.renderer.status === 'offline'
    )
  })
})

test.group('Renderer presence', () => {
  test('a fresh process marks offline only the renderers left online', async ({ assert }) => {
    const user = await createUser()
    const rendererService = await app.container.make(RendererService)

    const { renderer: stale } = await rendererService.createRenderer({
      name: 'Stale',
      ownerId: user.id,
    })
    const { renderer: idle } = await rendererService.createRenderer({
      name: 'Idle',
      ownerId: user.id,
    })

    stale.status = 'online'
    await stale.save()

    const idleSince = DateTime.fromISO('2026-01-01T00:00:00Z')
    idle.lastSeenAt = idleSince
    await idle.save()

    await new RendererPresenceService().resetAll()

    await stale.refresh()
    await idle.refresh()

    assert.equal(stale.status, 'offline')
    assert.isNotNull(stale.lastSeenAt)
    assert.equal(idle.lastSeenAt!.toMillis(), idleSince.toMillis())
  })
})
