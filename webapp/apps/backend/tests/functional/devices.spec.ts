import Device from '#models/device'
import Renderer from '#models/renderer'
import Scene from '#models/scene'
import { TokenService } from '#services/token_service'
import { createUser, platformRenderer } from '#tests/helpers'
import { test } from '@japa/runner'

/**
 * The api client types a response by URL pattern, which cannot tell `index`
 * from `store` on a shared path. These narrow the payload back down.
 */
interface DevicePayload {
  id: string
  name: string
  userId: string
  rendererId: string
  sceneId: string | null
  tokenPrefix: string
  panelType: string
  kind: string
  width: number
  height: number
  chainLength: number
  brightness: number
  maxFps: number | null
  offlineGrace: number | null
  firmwareVersion: string | null
  protocolVersion: number | null
  status: string
  lastSeenAt: string | null
  ipAddress: string | null
  token?: string
}

function deviceFrom(body: unknown) {
  return (body as { data: DevicePayload }).data
}

/**
 * Pairing is the only response carrying a clear token.
 */
function issuedDeviceFrom(body: unknown) {
  return (body as { data: DevicePayload & { token: string } }).data
}

function devicesFrom(body: unknown) {
  return (body as { data: DevicePayload[] }).data
}

async function createScene(userId: string, width: number, height: number) {
  return Scene.create({
    name: 'Clock',
    userId,
    width,
    height,
    targetFps: 30,
    config: { version: 1, nodes: [] },
  })
}

test.group('Devices', () => {
  test('returns the clear token once, when the device is paired', async ({ client, assert }) => {
    const user = await createUser()
    await platformRenderer()

    const response = await client
      .post('/api/v1/devices')
      .json({ name: 'Kitchen panel', width: 64, height: 32 })
      .loginAs(user)

    response.assertStatus(201)

    const created = issuedDeviceFrom(response.body())
    assert.isString(created.token)
    assert.isTrue(created.token.startsWith('mxd_'))
    assert.isTrue(created.token.includes(created.tokenPrefix))
  })

  test('never returns the token again', async ({ client, assert }) => {
    const user = await createUser()
    await platformRenderer()

    const creation = await client
      .post('/api/v1/devices')
      .json({ name: 'Kitchen panel', width: 64, height: 32 })
      .loginAs(user)

    const { id } = deviceFrom(creation.body())

    const show = await client.get(`/api/v1/devices/${id}`).loginAs(user)
    const index = await client.get('/api/v1/devices').loginAs(user)

    show.assertStatus(200)
    index.assertStatus(200)
    assert.isUndefined(deviceFrom(show.body()).token)
    assert.isUndefined(devicesFrom(index.body())[0]!.token)
  })

  test('never exposes the token fingerprint', async ({ client, assert }) => {
    const user = await createUser()
    await platformRenderer()

    const creation = await client
      .post('/api/v1/devices')
      .json({ name: 'Kitchen panel', width: 64, height: 32 })
      .loginAs(user)

    const show = await client.get(`/api/v1/devices/${deviceFrom(creation.body()).id}`).loginAs(user)

    assert.notProperty(deviceFrom(show.body()), 'tokenHash')
    assert.isString(deviceFrom(show.body()).tokenPrefix)
  })

  test('ignores fields the device declares on its own', async ({ client, assert }) => {
    const user = await createUser()
    await platformRenderer()

    const response = await client
      .post('/api/v1/devices')
      .json({
        name: 'Kitchen panel',
        width: 64,
        height: 32,
        status: 'online',
        lastSeenAt: '2026-01-01T00:00:00.000Z',
        ipAddress: '10.0.0.1',
        firmwareVersion: '9.9.9',
        protocolVersion: 42,
      })
      .loginAs(user)

    response.assertStatus(201)

    const created = deviceFrom(response.body())
    assert.equal(created.status, 'offline')
    assert.isNull(created.lastSeenAt)
    assert.isNull(created.ipAddress)
    assert.isNull(created.firmwareVersion)
    assert.isNull(created.protocolVersion)
  })

  /**
   * `kind` is chosen at pairing and never moves afterwards
   * (docs/adr/0020-simulateur-device-declare.md), so the patch validator does
   * not know the field at all — nor `panelType`.
   */
  test('refuses to change kind or panelType after creation', async ({ client, assert }) => {
    const user = await createUser()
    await platformRenderer()

    const creation = await client
      .post('/api/v1/devices')
      .json({ name: 'Kitchen panel', width: 64, height: 32, kind: 'simulator' })
      .loginAs(user)

    const device = deviceFrom(creation.body())
    assert.equal(device.kind, 'simulator')

    const patch = await client
      .patch(`/api/v1/devices/${device.id}`)
      .json({ kind: 'hardware', panelType: 'hub75' })
      .loginAs(user)

    patch.assertStatus(200)

    const stored = await Device.findOrFail(device.id)
    assert.equal(stored.kind, 'simulator')
  })

  test('rejects a geometry above the protocol maximum', async ({ client, assert }) => {
    const user = await createUser()
    await platformRenderer()

    const response = await client
      .post('/api/v1/devices')
      .json({ name: 'Too big', width: 300, height: 300 })
      .loginAs(user)

    response.assertStatus(422)

    const [failure] = (response.body() as unknown as { errors: { message: string }[] }).errors
    assert.include(failure!.message, '300x300')
  })

  test('requires a strictly positive geometry', async ({ client }) => {
    const user = await createUser()
    await platformRenderer()

    const zero = await client
      .post('/api/v1/devices')
      .json({ name: 'Nothing', width: 0, height: 32 })
      .loginAs(user)

    const negative = await client
      .post('/api/v1/devices')
      .json({ name: 'Nothing', width: 64, height: -32 })
      .loginAs(user)

    zero.assertStatus(422)
    negative.assertStatus(422)
  })

  test('defaults the optional settings to the values of the specs', async ({ client, assert }) => {
    const user = await createUser()
    await platformRenderer()

    const response = await client
      .post('/api/v1/devices')
      .json({ name: 'Kitchen panel', width: 64, height: 32 })
      .loginAs(user)

    response.assertStatus(201)

    const created = deviceFrom(response.body())
    assert.isNull(created.maxFps)
    assert.equal(created.brightness, 128)
    assert.equal(created.offlineGrace, 604800)
    assert.equal(created.chainLength, 1)
    assert.equal(created.kind, 'hardware')
    assert.equal(created.panelType, 'hub75')
    assert.isNull(created.sceneId)
  })

  test('bounds maxFps to 1..60', async ({ client, assert }) => {
    const user = await createUser()
    await platformRenderer()

    const tooLow = await client
      .post('/api/v1/devices')
      .json({ name: 'Kitchen panel', width: 64, height: 32, maxFps: 0 })
      .loginAs(user)

    const tooHigh = await client
      .post('/api/v1/devices')
      .json({ name: 'Kitchen panel', width: 64, height: 32, maxFps: 61 })
      .loginAs(user)

    const uncapped = await client
      .post('/api/v1/devices')
      .json({ name: 'Kitchen panel', width: 64, height: 32, maxFps: null })
      .loginAs(user)

    tooLow.assertStatus(422)
    tooHigh.assertStatus(422)
    uncapped.assertStatus(201)
    assert.isNull(deviceFrom(uncapped.body()).maxFps)
  })

  test('bounds brightness to 0..255', async ({ client, assert }) => {
    const user = await createUser()
    await platformRenderer()

    const tooHigh = await client
      .post('/api/v1/devices')
      .json({ name: 'Kitchen panel', width: 64, height: 32, brightness: 256 })
      .loginAs(user)

    const negative = await client
      .post('/api/v1/devices')
      .json({ name: 'Kitchen panel', width: 64, height: 32, brightness: -1 })
      .loginAs(user)

    const off = await client
      .post('/api/v1/devices')
      .json({ name: 'Kitchen panel', width: 64, height: 32, brightness: 0 })
      .loginAs(user)

    tooHigh.assertStatus(422)
    negative.assertStatus(422)
    off.assertStatus(201)
    assert.equal(deviceFrom(off.body()).brightness, 0)
  })

  /**
   * Unlimited is a legitimate choice for a panel carrying nothing sensitive,
   * never a default (docs/adr/0015-bail-de-session-device.md).
   */
  test('accepts a null offlineGrace as unlimited', async ({ client, assert }) => {
    const user = await createUser()
    await platformRenderer()

    const response = await client
      .post('/api/v1/devices')
      .json({ name: 'Kitchen panel', width: 64, height: 32, offlineGrace: null })
      .loginAs(user)

    response.assertStatus(201)
    assert.isNull(deviceFrom(response.body()).offlineGrace)
  })

  test('attaches a device to the default renderer when none is asked for', async ({
    client,
    assert,
  }) => {
    const user = await createUser()
    const defaultRenderer = await platformRenderer()

    const response = await client
      .post('/api/v1/devices')
      .json({ name: 'Kitchen panel', width: 64, height: 32 })
      .loginAs(user)

    response.assertStatus(201)
    assert.equal(deviceFrom(response.body()).rendererId, defaultRenderer.id)
  })

  test('refuses a renderer belonging to somebody else', async ({ client, assert }) => {
    const user = await createUser()
    const stranger = await createUser()
    await platformRenderer()

    const credential = await new TokenService().issue('renderer')
    const theirRenderer = await Renderer.create({
      name: 'Their renderer',
      ownerId: stranger.id,
      tokenPrefix: credential.prefix,
      tokenHash: credential.hash,
    })

    const response = await client
      .post('/api/v1/devices')
      .json({
        name: 'Kitchen panel',
        width: 64,
        height: 32,
        rendererId: theirRenderer.id,
      })
      .loginAs(user)

    response.assertStatus(422)
    assert.lengthOf(await Device.all(), 0)
  })

  test('lists only the caller own devices', async ({ client, assert }) => {
    const owner = await createUser()
    const stranger = await createUser()
    await platformRenderer()

    await client
      .post('/api/v1/devices')
      .json({ name: 'Mine', width: 64, height: 32 })
      .loginAs(owner)
    await client
      .post('/api/v1/devices')
      .json({ name: 'Theirs', width: 64, height: 32 })
      .loginAs(stranger)

    const response = await client.get('/api/v1/devices').loginAs(owner)

    response.assertStatus(200)
    const devices = devicesFrom(response.body())
    assert.lengthOf(devices, 1)
    assert.equal(devices[0]!.name, 'Mine')
  })

  test('hides the devices of other users', async ({ client }) => {
    const owner = await createUser()
    const stranger = await createUser()
    await platformRenderer()

    const creation = await client
      .post('/api/v1/devices')
      .json({ name: 'Mine', width: 64, height: 32 })
      .loginAs(owner)

    const device = deviceFrom(creation.body())

    const show = await client.get(`/api/v1/devices/${device.id}`).loginAs(stranger)
    const patch = await client
      .patch(`/api/v1/devices/${device.id}`)
      .json({ name: 'Stolen' })
      .loginAs(stranger)
    const destroy = await client.delete(`/api/v1/devices/${device.id}`).loginAs(stranger)

    show.assertStatus(403)
    patch.assertStatus(403)
    destroy.assertStatus(403)
  })

  test('refuses a scene belonging to somebody else', async ({ client }) => {
    const user = await createUser()
    const stranger = await createUser()
    await platformRenderer()

    const theirScene = await createScene(stranger.id, 64, 32)

    const response = await client
      .post('/api/v1/devices')
      .json({ name: 'Kitchen panel', width: 64, height: 32, sceneId: theirScene.id })
      .loginAs(user)

    response.assertStatus(422)
  })

  test('requires an authenticated user', async ({ client }) => {
    const response = await client.get('/api/v1/devices')

    response.assertStatus(401)
  })
})

/**
 * The table of docs/adr/0018-geometrie-native-de-la-scene.md, verbatim: a
 * scene is displayable when the device geometry is a multiple of its own by
 * the same integer factor on both axes.
 */
test.group('Device and scene geometry', () => {
  const cases: { device: [number, number]; accepted: boolean; why: string }[] = [
    { device: [64, 32], accepted: true, why: 'k = 1' },
    { device: [128, 64], accepted: true, why: 'k = 2, exact replication' },
    { device: [32, 32], accepted: false, why: 'it would destroy one pixel out of two' },
    { device: [128, 32], accepted: false, why: 'a different k per axis stretches the image' },
    { device: [96, 48], accepted: false, why: 'k = 1.5 doubles some pixels and not others' },
  ]

  for (const { device, accepted, why } of cases) {
    const [width, height] = device

    test(`${accepted ? 'accepts' : 'refuses'} a 64x32 scene on a ${width}x${height} device (${why})`, async ({
      client,
    }) => {
      const user = await createUser()
      await platformRenderer()

      const scene = await createScene(user.id, 64, 32)

      const response = await client
        .post('/api/v1/devices')
        .json({ name: 'Kitchen panel', width, height, sceneId: scene.id })
        .loginAs(user)

      response.assertStatus(accepted ? 201 : 422)
    })
  }

  test('refuses a geometry patch that would invalidate the assigned scene', async ({
    client,
    assert,
  }) => {
    const user = await createUser()
    await platformRenderer()

    const scene = await createScene(user.id, 64, 32)

    const creation = await client
      .post('/api/v1/devices')
      .json({ name: 'Kitchen panel', width: 64, height: 32, sceneId: scene.id })
      .loginAs(user)

    const device = deviceFrom(creation.body())

    const response = await client
      .patch(`/api/v1/devices/${device.id}`)
      .json({ width: 96, height: 48 })
      .loginAs(user)

    response.assertStatus(422)

    /**
     * Nothing partial reaches the database: an incompatible pair never stays
     * there, not even for the duration of the request.
     */
    const stored = await Device.findOrFail(device.id)
    assert.equal(stored.width, 64)
    assert.equal(stored.height, 32)
    assert.equal(stored.sceneId, scene.id)
  })

  test('accepts a geometry patch the assigned scene survives', async ({ client, assert }) => {
    const user = await createUser()
    await platformRenderer()

    const scene = await createScene(user.id, 64, 32)

    const creation = await client
      .post('/api/v1/devices')
      .json({ name: 'Kitchen panel', width: 64, height: 32, sceneId: scene.id })
      .loginAs(user)

    const device = deviceFrom(creation.body())

    const response = await client
      .patch(`/api/v1/devices/${device.id}`)
      .json({ width: 128, height: 64 })
      .loginAs(user)

    response.assertStatus(200)
    assert.equal(deviceFrom(response.body()).width, 128)
  })

  /**
   * Unassigning is the way out of a geometry the scene cannot follow — the
   * caller says what becomes of the scene rather than having it dropped
   * silently.
   */
  test('accepts an incompatible geometry once the scene is unassigned', async ({
    client,
    assert,
  }) => {
    const user = await createUser()
    await platformRenderer()

    const scene = await createScene(user.id, 64, 32)

    const creation = await client
      .post('/api/v1/devices')
      .json({ name: 'Kitchen panel', width: 64, height: 32, sceneId: scene.id })
      .loginAs(user)

    const device = deviceFrom(creation.body())

    const response = await client
      .patch(`/api/v1/devices/${device.id}`)
      .json({ width: 96, height: 48, sceneId: null })
      .loginAs(user)

    response.assertStatus(200)
    assert.isNull(deviceFrom(response.body()).sceneId)
  })
})
