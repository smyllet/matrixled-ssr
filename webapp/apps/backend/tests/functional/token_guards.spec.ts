import { DeviceService } from '#services/device_service'
import { RendererService } from '#services/renderer_service'
import { createUser, platformRenderer } from '#tests/helpers'
import { errors } from '@adonisjs/auth'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import { test } from '@japa/runner'

/**
 * The control-plane WebSocket authenticates renderers on its handshake, outside
 * any route (see renderer_control.spec.ts). Both guards are exercised here as
 * configured, through the auth manager, on a bare request carrying only a
 * bearer token.
 */
async function authenticatorFor(token: string) {
  const ctx = await testUtils.createHttpContext()
  ctx.request.request.headers.authorization = `Bearer ${token}`

  const auth = await app.container.make('auth.manager')

  return auth.createAuthenticator(ctx)
}

async function issueRendererToken() {
  const rendererService = await app.container.make(RendererService)

  return rendererService.rotateToken(await platformRenderer())
}

async function issueDeviceToken() {
  const user = await createUser()
  await platformRenderer()

  const deviceService = await app.container.make(DeviceService)

  return deviceService.createDevice({
    name: 'Kitchen panel',
    width: 64,
    height: 32,
    userId: user.id,
  })
}

test.group('Token guards', () => {
  test('resolves a renderer token to its renderer', async ({ assert }) => {
    const { renderer, token } = await issueRendererToken()

    const auth = await authenticatorFor(token)
    const authenticated = await auth.use('renderer').authenticate()

    assert.equal(authenticated.id, renderer.id)
  })

  test('refuses a device token on the renderer guard', async ({ assert }) => {
    const { token } = await issueDeviceToken()

    const auth = await authenticatorFor(token)

    await assert.rejects(() => auth.use('renderer').authenticate(), errors.E_UNAUTHORIZED_ACCESS)
  })

  test('refuses a renderer token on the device guard', async ({ assert }) => {
    const { token } = await issueRendererToken()

    const auth = await authenticatorFor(token)

    await assert.rejects(() => auth.use('device').authenticate(), errors.E_UNAUTHORIZED_ACCESS)
  })

  test('stops accepting a renderer token once it is rotated', async ({ assert }) => {
    const { token: previous } = await issueRendererToken()
    await issueRendererToken()

    const auth = await authenticatorFor(previous)

    assert.isFalse(await auth.use('renderer').check())
  })
})
