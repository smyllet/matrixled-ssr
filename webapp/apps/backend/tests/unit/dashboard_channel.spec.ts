import { authorizePlatformChannel, authorizeUserChannel } from '#channels/dashboard_channel'
import type { HttpContext } from '@adonisjs/core/http'
import { test } from '@japa/runner'

function ctxFor(userId: string | undefined) {
  const user = userId ? { id: userId } : undefined

  /**
   * Only the session guard knows the user: a rule reading `auth.user`, or any
   * other guard, sees nobody and fails the tests that expect access.
   */
  return {
    auth: { use: (guard: string) => ({ user: guard === 'web' ? user : undefined }) },
  } as unknown as HttpContext
}

test.group('Dashboard channel authorization', () => {
  test('authorizes a user subscribing to their own channel', ({ assert }) => {
    assert.isTrue(authorizeUserChannel(ctxFor('user-1'), { id: 'user-1' }))
  })

  test('refuses a user subscribing to another user channel', ({ assert }) => {
    assert.isFalse(authorizeUserChannel(ctxFor('user-1'), { id: 'user-2' }))
  })

  test('refuses an unauthenticated request on a user channel', ({ assert }) => {
    assert.isFalse(authorizeUserChannel(ctxFor(undefined), { id: 'user-1' }))
  })

  test('authorizes any signed-in user on the platform channel', ({ assert }) => {
    assert.isTrue(authorizePlatformChannel(ctxFor('user-1')))
    assert.isTrue(authorizePlatformChannel(ctxFor('user-2')))
  })

  test('refuses an unauthenticated request on the platform channel', ({ assert }) => {
    assert.isFalse(authorizePlatformChannel(ctxFor(undefined)))
  })
})
