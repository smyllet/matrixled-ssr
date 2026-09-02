import { createUser } from '#tests/helpers'
import type { HttpContext } from '@adonisjs/core/http'
import transmit from '@adonisjs/transmit/services/main'
import { test } from '@japa/runner'

function ctxFor(userId: string | undefined) {
  return { auth: { user: userId ? { id: userId } : undefined } } as unknown as HttpContext
}

test.group('Dashboard subscriptions', () => {
  test('refuses an unauthenticated event stream', async ({ client }) => {
    const response = await client.get('/__transmit/events')

    response.assertStatus(401)
  })

  test('refuses an unauthenticated subscription', async ({ client }) => {
    const response = await client
      .post('/__transmit/subscribe')
      .json({ uid: 'stream-uid', channel: 'users/whoever' })

    response.assertStatus(401)
  })

  /**
   * Asserted through the stream manager rather than over HTTP, and that is not
   * a shortcut. `POST /__transmit/subscribe` answers `400` both when the rule
   * refuses and when the `uid` has no open stream — and the api client cannot
   * open one, since it buffers a response that never ends. An HTTP assertion
   * would therefore stay green with `transmit.authorize()` deleted, which is
   * exactly the failure this test exists to catch: an unsecured channel is
   * allowed to everyone by default.
   */
  test('secures the user channel to its owner', async ({ assert }) => {
    const owner = await createUser()
    const stranger = await createUser()
    const manager = transmit.getManager()

    assert.isTrue(await manager.verifyAccess(`users/${owner.id}`, ctxFor(owner.id)))
    assert.isFalse(await manager.verifyAccess(`users/${stranger.id}`, ctxFor(owner.id)))
  })

  test('opens the platform channel to signed-in users only', async ({ assert }) => {
    const user = await createUser()
    const manager = transmit.getManager()

    assert.isTrue(await manager.verifyAccess('platform', ctxFor(user.id)))
    assert.isFalse(await manager.verifyAccess('platform', ctxFor(undefined)))
  })
})
