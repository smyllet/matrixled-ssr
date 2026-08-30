import Renderer from '#models/renderer'
import User from '#models/user'
import { RendererService } from '#services/renderer_service'
import { TokenService } from '#services/token_service'
import { test } from '@japa/runner'

/**
 * The api client types a response by URL pattern, which cannot tell `index`
 * from `store` on a shared path. These narrow the payload back down.
 */
interface RendererPayload {
  id: string
  name: string
  ownerId: string | null
  isDefault: boolean
  tokenPrefix: string
  version: string | null
  endpoint: string | null
  status: string
  token?: string
}

function rendererFrom(body: unknown) {
  return (body as { data: RendererPayload }).data
}

/**
 * Creation and rotation are the only two responses carrying a clear token.
 */
function issuedRendererFrom(body: unknown) {
  return (body as { data: RendererPayload & { token: string } }).data
}

function renderersFrom(body: unknown) {
  return (body as { data: RendererPayload[] }).data
}

let sequence = 0

async function createUser() {
  sequence += 1

  return User.create({
    fullName: 'Ada Lovelace',
    email: `ada-${sequence}@example.test`,
    password: 'secret123',
  })
}

/**
 * The suite truncates between tests, which also removes the platform renderer
 * inserted by its migration. Tests that need it recreate it.
 */
async function createPlatformRenderer() {
  const credential = await new TokenService().issue('renderer')

  return Renderer.create({
    name: 'Platform renderer',
    ownerId: null,
    isDefault: true,
    tokenPrefix: credential.prefix,
    tokenHash: credential.hash,
  })
}

test.group('Renderers', () => {
  test('returns the clear token once, when the renderer is created', async ({ client, assert }) => {
    const user = await createUser()

    const response = await client
      .post('/api/v1/renderers')
      .json({ name: 'Living room renderer' })
      .loginAs(user)

    response.assertStatus(201)

    const created = issuedRendererFrom(response.body())
    assert.isString(created.token)
    assert.isTrue(created.token.startsWith('mxr_'))
    assert.isTrue(created.token.includes(created.tokenPrefix))
  })

  test('never returns the token again', async ({ client, assert }) => {
    const user = await createUser()

    const creation = await client
      .post('/api/v1/renderers')
      .json({ name: 'Living room renderer' })
      .loginAs(user)

    const { id } = rendererFrom(creation.body())

    const show = await client.get(`/api/v1/renderers/${id}`).loginAs(user)
    const index = await client.get('/api/v1/renderers').loginAs(user)

    show.assertStatus(200)
    index.assertStatus(200)
    assert.isUndefined(rendererFrom(show.body()).token)
    assert.isUndefined(renderersFrom(index.body())[0]!.token)
  })

  test('never exposes the token fingerprint', async ({ client, assert }) => {
    const user = await createUser()

    const creation = await client
      .post('/api/v1/renderers')
      .json({ name: 'Living room renderer' })
      .loginAs(user)

    const show = await client
      .get(`/api/v1/renderers/${rendererFrom(creation.body()).id}`)
      .loginAs(user)

    assert.notProperty(rendererFrom(show.body()), 'tokenHash')
    assert.isString(rendererFrom(show.body()).tokenPrefix)
  })

  test('ignores fields the renderer declares on its own', async ({ client, assert }) => {
    const user = await createUser()

    const response = await client
      .post('/api/v1/renderers')
      .json({
        name: 'Living room renderer',
        version: '9.9.9',
        endpoint: 'wss://attacker.example',
        status: 'online',
        isDefault: true,
      })
      .loginAs(user)

    response.assertStatus(201)

    const created = rendererFrom(response.body())
    assert.isNull(created.version)
    assert.isNull(created.endpoint)
    assert.equal(created.status, 'offline')
    assert.isFalse(created.isDefault)
  })

  test('lists the platform renderer alongside the user renderers', async ({ client, assert }) => {
    const user = await createUser()
    await createPlatformRenderer()

    await client.post('/api/v1/renderers').json({ name: 'Mine' }).loginAs(user)

    const response = await client.get('/api/v1/renderers').loginAs(user)

    response.assertStatus(200)
    assert.lengthOf(renderersFrom(response.body()), 2)
  })

  test('hides the renderers of other users', async ({ client }) => {
    const owner = await createUser()
    const stranger = await createUser()

    const creation = await client
      .post('/api/v1/renderers')
      .json({ name: 'Living room renderer' })
      .loginAs(owner)

    const response = await client
      .get(`/api/v1/renderers/${rendererFrom(creation.body()).id}`)
      .loginAs(stranger)

    response.assertStatus(403)
  })

  test('refuses to modify the platform renderer', async ({ client }) => {
    const user = await createUser()
    const platformRenderer = await createPlatformRenderer()

    const patch = await client
      .patch(`/api/v1/renderers/${platformRenderer.id}`)
      .json({ name: 'Mine now' })
      .loginAs(user)

    const destroy = await client.delete(`/api/v1/renderers/${platformRenderer.id}`).loginAs(user)

    patch.assertStatus(403)
    destroy.assertStatus(403)
  })

  test('invalidates the previous token when rotating', async ({ client, assert }) => {
    const user = await createUser()
    const tokenService = new TokenService()

    const creation = await client
      .post('/api/v1/renderers')
      .json({ name: 'Living room renderer' })
      .loginAs(user)

    const { id, token: previousToken } = issuedRendererFrom(creation.body())

    const rotation = await client.post(`/api/v1/renderers/${id}/token`).loginAs(user)

    rotation.assertStatus(200)

    const renderer = await Renderer.findOrFail(id)
    const rotatedToken = issuedRendererFrom(rotation.body()).token

    assert.notEqual(rotatedToken, previousToken)
    assert.isFalse(await tokenService.verify(renderer.tokenHash, previousToken, 'renderer'))
    assert.isTrue(await tokenService.verify(renderer.tokenHash, rotatedToken, 'renderer'))
  })

  test('requires an authenticated user', async ({ client }) => {
    const response = await client.get('/api/v1/renderers')

    response.assertStatus(401)
  })
})

test.group('Platform renderer', () => {
  test('allows only one default renderer', async ({ assert }) => {
    await createPlatformRenderer()

    await assert.rejects(() => createPlatformRenderer())
  })

  test('refuses a default renderer with an owner', async ({ assert }) => {
    const user = await createUser()
    const credential = await new TokenService().issue('renderer')

    await assert.rejects(() =>
      Renderer.create({
        name: 'Not the platform renderer',
        ownerId: user.id,
        isDefault: true,
        tokenPrefix: credential.prefix,
        tokenHash: credential.hash,
      })
    )
  })

  test('is resolved by the service without knowing its id', async ({ assert }) => {
    const platformRenderer = await createPlatformRenderer()
    const rendererService = new RendererService(new TokenService())

    const defaultRenderer = await rendererService.getDefaultRenderer()

    assert.equal(defaultRenderer.id, platformRenderer.id)
  })
})

test.group('Platform renderer provisioning', () => {
  test('applies the credential declared by the deployment', async ({ assert }) => {
    await createPlatformRenderer()

    const tokenService = new TokenService()
    const rendererService = new RendererService(tokenService)
    const declared = await tokenService.issue('renderer')

    const renderer = await rendererService.provisionPlatformRenderer(declared.token)

    assert.equal(renderer?.tokenPrefix, declared.prefix)
    assert.isTrue(await tokenService.verify(renderer!.tokenHash, declared.token, 'renderer'))
  })

  test('leaves the credential alone when it is already the declared one', async ({ assert }) => {
    const platformRenderer = await createPlatformRenderer()

    const tokenService = new TokenService()
    const rendererService = new RendererService(tokenService)
    const declared = await tokenService.issue('renderer')

    await rendererService.provisionPlatformRenderer(declared.token)
    const provisioned = await Renderer.findOrFail(platformRenderer.id)

    await rendererService.provisionPlatformRenderer(declared.token)
    const reprovisioned = await Renderer.findOrFail(platformRenderer.id)

    assert.equal(provisioned.tokenHash, reprovisioned.tokenHash)
  })

  test('rejects a token that is not a renderer token', async ({ assert }) => {
    await createPlatformRenderer()

    const tokenService = new TokenService()
    const rendererService = new RendererService(tokenService)
    const deviceToken = await tokenService.issue('device')

    await assert.rejects(() => rendererService.provisionPlatformRenderer(deviceToken.token))
    await assert.rejects(() => rendererService.provisionPlatformRenderer('nonsense'))
  })

  test('does nothing when there is no platform renderer', async ({ assert }) => {
    const tokenService = new TokenService()
    const rendererService = new RendererService(tokenService)
    const declared = await tokenService.issue('renderer')

    assert.isNull(await rendererService.provisionPlatformRenderer(declared.token))
  })
})
