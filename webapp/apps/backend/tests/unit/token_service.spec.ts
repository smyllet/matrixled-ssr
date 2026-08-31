import { TokenService } from '#services/token_service'
import { test } from '@japa/runner'

const tokenService = new TokenService()

test.group('Token service', () => {
  test('issues a token carrying its scope and prefix', async ({ assert }) => {
    const credential = await tokenService.issue('renderer')

    assert.isTrue(credential.token.startsWith('mxr_'))
    assert.deepEqual(tokenService.parse(credential.token), {
      scope: 'renderer',
      prefix: credential.prefix,
      secret: credential.token.split('_')[2],
    })
  })

  test('never stores the clear token', async ({ assert }) => {
    const credential = await tokenService.issue('renderer')

    assert.notInclude(credential.hash, credential.token)
  })

  test('verifies a token against its own hash', async ({ assert }) => {
    const credential = await tokenService.issue('device')

    assert.isTrue(await tokenService.verify(credential.hash, credential.token, 'device'))
  })

  test('rejects a tampered secret', async ({ assert }) => {
    const credential = await tokenService.issue('device')
    const [tag, prefix] = credential.token.split('_')

    assert.isFalse(
      await tokenService.verify(credential.hash, `${tag}_${prefix}_deadbeef`, 'device')
    )
  })

  /**
   * A device token presented on the renderer channel must not authenticate,
   * even if the secret is genuine.
   */
  test('rejects a token issued for another scope', async ({ assert }) => {
    const credential = await tokenService.issue('device')

    assert.isFalse(await tokenService.verify(credential.hash, credential.token, 'renderer'))
  })

  test('rejects a malformed token', async ({ assert }) => {
    assert.isNull(tokenService.parse('not-a-token'))
    assert.isNull(tokenService.parse('mxr_only-two-parts'))
    assert.isNull(tokenService.parse('unknown_prefix_secret'))
  })

  test('issues a distinct prefix every time', async ({ assert }) => {
    const first = await tokenService.issue('renderer')
    const second = await tokenService.issue('renderer')

    assert.notEqual(first.prefix, second.prefix)
  })
})
