import { RENDERER_ENDPOINT_MAXIMUM_LENGTH, RENDERER_MAXIMUM_ENDPOINTS } from '#constants/renderer'
import { rendererEndpointsValidator } from '#validators/renderer'
import { test } from '@japa/runner'

/**
 * Nothing writes `renderers.endpoints` until the control plane lands (#21), so
 * these tests are what makes "bounded and validated before persistence"
 * (docs/adr/0016-transports-declares-par-le-renderer.md) an actual check
 * rather than an intention.
 */
async function accepts(endpoints: unknown) {
  await rendererEndpointsValidator.validate(endpoints)
}

test.group('Renderer endpoints', () => {
  test('accepts the transports a renderer may announce', async () => {
    await accepts(['wss://renderer.example.com'])
    await accepts(['wss://renderer.lan:8889', 'ws://192.168.1.50:8889'])
    await accepts(['ws://192.168.1.50:8889/socket'])
  })

  test('accepts an IPv6 address and a bare host', async () => {
    await accepts(['ws://[2001:db8::50]:8889'])
    await accepts(['ws://localhost:8889'])
  })

  test('rejects a transport a device could not open', async ({ assert }) => {
    await assert.rejects(() => accepts(['http://192.168.1.50:8889']))
    await assert.rejects(() => accepts(['javascript:alert(1)']))
    await assert.rejects(() => accepts(['192.168.1.50:8889']))
  })

  test('rejects a declaration that announces nothing', async ({ assert }) => {
    await assert.rejects(() => accepts([]))
  })

  test('rejects more entries than the bound allows', async ({ assert }) => {
    const withinBound = Array.from(
      { length: RENDERER_MAXIMUM_ENDPOINTS },
      (_, index) => `ws://192.168.1.${index}:8889`
    )

    await accepts(withinBound)
    await assert.rejects(() => accepts([...withinBound, 'ws://192.168.1.250:8889']))
  })

  test('rejects an entry longer than the bound allows', async ({ assert }) => {
    const prefix = 'wss://renderer.example.com/'
    const path = 'a'.repeat(RENDERER_ENDPOINT_MAXIMUM_LENGTH - prefix.length + 1)

    await assert.rejects(() => accepts([`${prefix}${path}`]))
  })
})
