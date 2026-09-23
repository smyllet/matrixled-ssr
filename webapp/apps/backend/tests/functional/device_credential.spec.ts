import DeviceCredentialRotated from '#events/device_credential_rotated'
import Device from '#models/device'
import { DeviceService } from '#services/device_service'
import { createUser, platformRenderer } from '#tests/helpers'
import app from '@adonisjs/core/services/app'
import emitter from '@adonisjs/core/services/emitter'
import { test } from '@japa/runner'

interface RotatedPayload {
  id: string
  tokenPrefix: string
  token: string
}

function rotatedFrom(body: unknown) {
  return (body as { data: RotatedPayload }).data
}

async function pairDevice() {
  const user = await createUser()
  await platformRenderer()

  const deviceService = await app.container.make(DeviceService)
  const { device, token } = await deviceService.createDevice({
    name: 'Kitchen panel',
    width: 64,
    height: 32,
    userId: user.id,
  })

  return { user, device, token }
}

test.group('Device credential rotation', () => {
  test('issues a new token and shows it once', async ({ client, assert }) => {
    const { user, device, token: previousToken } = await pairDevice()

    const response = await client.post(`/api/v1/devices/${device.id}/credential`).loginAs(user)

    response.assertStatus(200)

    const rotated = rotatedFrom(response.body())
    assert.equal(rotated.id, device.id)
    assert.isTrue(rotated.token.startsWith('mxd_'))
    assert.notEqual(rotated.token, previousToken)
    assert.notEqual(rotated.tokenPrefix, device.tokenPrefix)
    assert.notProperty(rotated, 'tokenHash')

    const stored = await Device.findOrFail(device.id)
    assert.equal(stored.tokenPrefix, rotated.tokenPrefix)

    const show = await client.get(`/api/v1/devices/${device.id}`).loginAs(user)
    assert.notProperty((show.body() as { data: object }).data, 'token')
  })

  test('invalidates the previous token immediately', async ({ client }) => {
    const { user, device, token: previousToken } = await pairDevice()

    const response = await client.post(`/api/v1/devices/${device.id}/credential`).loginAs(user)
    const { token } = rotatedFrom(response.body())

    const refused = await client.get('/api/v1/device/bootstrap').bearerToken(previousToken)
    refused.assertStatus(401)

    const accepted = await client.get('/api/v1/device/bootstrap').bearerToken(token)
    accepted.assertStatus(200)
  })

  test('is reserved to the owner', async ({ client }) => {
    const { device, token } = await pairDevice()
    const stranger = await createUser()

    const response = await client.post(`/api/v1/devices/${device.id}/credential`).loginAs(stranger)
    response.assertStatus(403)

    const stillValid = await client.get('/api/v1/device/bootstrap').bearerToken(token)
    stillValid.assertStatus(200)
  })

  test('requires a session', async ({ client }) => {
    const { device, token } = await pairDevice()

    const anonymous = await client.post(`/api/v1/devices/${device.id}/credential`)
    anonymous.assertStatus(401)

    /**
     * A device cannot rotate its own credential: the route belongs to the
     * dashboard, and only the session guard is consulted.
     */
    const asDevice = await client.post(`/api/v1/devices/${device.id}/credential`).bearerToken(token)
    asDevice.assertStatus(401)
  })

  test('answers 404 for an unknown device', async ({ client }) => {
    const user = await createUser()

    const response = await client
      .post('/api/v1/devices/8e0f7a52-1f4e-4c1b-9a53-5d0e3b6c2f11/credential')
      .loginAs(user)

    response.assertStatus(404)
  })

  test('emits device.credential_rotated with the new prefix', async () => {
    const { device } = await pairDevice()
    const previousPrefix = device.tokenPrefix
    const deviceService = await app.container.make(DeviceService)

    using fakeEmitter = emitter.fake()

    await deviceService.rotateCredential(device)

    fakeEmitter.assertEmitted(
      DeviceCredentialRotated,
      ({ data }) =>
        data.id === device.id &&
        data.userId === device.userId &&
        data.device.tokenPrefix !== previousPrefix
    )
  })
})
