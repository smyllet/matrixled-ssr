import Scene from '#models/scene'
import { DeviceService } from '#services/device_service'
import { RendererService } from '#services/renderer_service'
import { createUser, platformRenderer } from '#tests/helpers'
import app from '@adonisjs/core/services/app'
import { test } from '@japa/runner'

interface BootstrapPayload {
  renderer_urls: string[]
  panel: { width: number; height: number; chain: number }
  scene_version: number | null
}

function bootstrapFrom(body: unknown) {
  return (body as { data: BootstrapPayload }).data
}

/**
 * Pairs a device through the service, which is the only place a clear device
 * token exists.
 */
async function pairDevice(options: { sceneId?: string; chainLength?: number } = {}) {
  const user = await createUser()
  await platformRenderer()

  const deviceService = await app.container.make(DeviceService)

  return deviceService.createDevice({
    name: 'Kitchen panel',
    width: 64,
    height: 32,
    userId: user.id,
    ...options,
  })
}

test.group('Device bootstrap', () => {
  test('tells a device where its renderer is', async ({ client, assert }) => {
    const { device, token } = await pairDevice({ chainLength: 2 })

    const renderer = await platformRenderer()
    renderer.endpoints = ['wss://renderer.example.net:8889', 'ws://192.168.1.50:8889']
    await renderer.save()

    const response = await client.get('/api/v1/device/bootstrap').bearerToken(token)

    response.assertStatus(200)
    assert.deepEqual(bootstrapFrom(response.body()), {
      renderer_urls: ['wss://renderer.example.net:8889', 'ws://192.168.1.50:8889'],
      panel: { width: device.width, height: device.height, chain: 2 },
      scene_version: null,
    })
  })

  test('reports the version of the assigned scene', async ({ client, assert }) => {
    const user = await createUser()
    const scene = await Scene.create({
      name: 'Clock',
      userId: user.id,
      width: 64,
      height: 32,
      targetFps: 30,
      config: { version: 1, nodes: [] },
    })
    await scene.refresh()

    await platformRenderer()
    const deviceService = await app.container.make(DeviceService)
    const { token } = await deviceService.createDevice({
      name: 'Kitchen panel',
      width: 64,
      height: 32,
      userId: user.id,
      sceneId: scene.id,
    })

    const response = await client.get('/api/v1/device/bootstrap').bearerToken(token)

    response.assertStatus(200)
    assert.equal(bootstrapFrom(response.body()).scene_version, scene.version)
  })

  test('returns an empty list until the renderer has declared its endpoints', async ({
    client,
    assert,
  }) => {
    const { token } = await pairDevice()

    const response = await client.get('/api/v1/device/bootstrap').bearerToken(token)

    response.assertStatus(200)
    assert.deepEqual(bootstrapFrom(response.body()).renderer_urls, [])
  })

  test('refuses a request without a token', async ({ client }) => {
    const response = await client.get('/api/v1/device/bootstrap')

    response.assertStatus(401)
  })

  test('refuses a wrong secret and an unknown prefix with the same answer', async ({
    client,
    assert,
  }) => {
    const { device, token } = await pairDevice()
    const wrongSecret = `mxd_${device.tokenPrefix}_${'0'.repeat(64)}`
    const unknownPrefix = token.replace(device.tokenPrefix, '000000000000')

    const first = await client.get('/api/v1/device/bootstrap').bearerToken(wrongSecret)
    const second = await client.get('/api/v1/device/bootstrap').bearerToken(unknownPrefix)
    const malformed = await client.get('/api/v1/device/bootstrap').bearerToken('not-a-token')

    first.assertStatus(401)
    second.assertStatus(401)
    malformed.assertStatus(401)
    assert.deepEqual(first.body(), second.body())
    assert.deepEqual(first.body(), malformed.body())
  })

  test('refuses in the JSON shape of the rest of the API', async ({ client, assert }) => {
    const response = await client.get('/api/v1/device/bootstrap')

    response.assertStatus(401)
    assert.include(response.header('content-type'), 'application/json')
    assert.deepEqual(response.body(), { errors: [{ message: 'Unauthorized access' }] })
  })

  test('refuses the token of a deleted device', async ({ client }) => {
    const { device, token } = await pairDevice()

    const deviceService = await app.container.make(DeviceService)
    await deviceService.deleteDevice(device)

    const response = await client.get('/api/v1/device/bootstrap').bearerToken(token)

    response.assertStatus(401)
  })

  test('refuses a renderer token', async ({ client }) => {
    await pairDevice()

    const rendererService = await app.container.make(RendererService)
    const { token } = await rendererService.rotateToken(await platformRenderer())

    const response = await client.get('/api/v1/device/bootstrap').bearerToken(token)

    response.assertStatus(401)
  })

  test('does not open a session: the dashboard stays closed to a device', async ({ client }) => {
    const { token } = await pairDevice()

    const response = await client.get('/api/v1/devices').bearerToken(token)

    response.assertStatus(401)
  })
})
