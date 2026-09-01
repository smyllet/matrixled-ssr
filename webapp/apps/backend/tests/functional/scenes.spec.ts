import Scene from '#models/scene'
import User from '#models/user'
import { test } from '@japa/runner'

interface ScenePayload {
  id: string
  name: string
  userId: string
  width: number
  height: number
  targetFps: number
  config: { version: 1; nodes: unknown[] }
  version: number
}

function sceneFrom(body: unknown) {
  return (body as { data: ScenePayload }).data
}

function scenesFrom(body: unknown) {
  return (body as { data: ScenePayload[] }).data
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

test.group('Scenes', () => {
  test('rejects a config without a version field', async ({ client }) => {
    const user = await createUser()

    const response = await client
      .post('/api/v1/scenes')
      .json({ name: 'Clock', width: 64, height: 32, config: { nodes: [] } })
      .loginAs(user)

    response.assertStatus(422)
  })

  test('rejects a node without a type', async ({ client }) => {
    const user = await createUser()

    const response = await client
      .post('/api/v1/scenes')
      .json({
        name: 'Clock',
        width: 64,
        height: 32,
        config: { version: 1, nodes: [{ gifName: 'pacman' }] },
      })
      .loginAs(user)

    response.assertStatus(422)
  })

  test('rejects a geometry above the protocol maximum', async ({ client, assert }) => {
    const user = await createUser()

    const response = await client
      .post('/api/v1/scenes')
      .json({ name: 'Too big', width: 300, height: 300 })
      .loginAs(user)

    response.assertStatus(422)

    const [failure] = (response.body() as unknown as { errors: { message: string }[] }).errors
    assert.include(failure!.message, '300x300')
  })

  test('defaults targetFps and config when omitted', async ({ client, assert }) => {
    const user = await createUser()

    const response = await client
      .post('/api/v1/scenes')
      .json({ name: 'Clock', width: 64, height: 32 })
      .loginAs(user)

    response.assertStatus(201)

    const created = sceneFrom(response.body())
    assert.equal(created.targetFps, 30)
    assert.deepEqual(created.config, { version: 1, nodes: [] })
    assert.equal(created.version, 1)
  })

  test('bounds targetFps to 1..60', async ({ client }) => {
    const user = await createUser()

    const tooLow = await client
      .post('/api/v1/scenes')
      .json({ name: 'Clock', width: 64, height: 32, targetFps: 0 })
      .loginAs(user)

    const tooHigh = await client
      .post('/api/v1/scenes')
      .json({ name: 'Clock', width: 64, height: 32, targetFps: 61 })
      .loginAs(user)

    tooLow.assertStatus(422)
    tooHigh.assertStatus(422)
  })

  test('lists only the caller own scenes', async ({ client, assert }) => {
    const owner = await createUser()
    const stranger = await createUser()

    await client.post('/api/v1/scenes').json({ name: 'Mine', width: 64, height: 32 }).loginAs(owner)
    await client
      .post('/api/v1/scenes')
      .json({ name: 'Theirs', width: 64, height: 32 })
      .loginAs(stranger)

    const response = await client.get('/api/v1/scenes').loginAs(owner)

    response.assertStatus(200)
    const scenes = scenesFrom(response.body())
    assert.lengthOf(scenes, 1)
    assert.equal(scenes[0]!.name, 'Mine')
  })

  test('hides the scenes of other users', async ({ client }) => {
    const owner = await createUser()
    const stranger = await createUser()

    const creation = await client
      .post('/api/v1/scenes')
      .json({ name: 'Mine', width: 64, height: 32 })
      .loginAs(owner)

    const scene = sceneFrom(creation.body())

    const show = await client.get(`/api/v1/scenes/${scene.id}`).loginAs(stranger)
    const patch = await client
      .patch(`/api/v1/scenes/${scene.id}`)
      .json({ name: 'Stolen' })
      .loginAs(stranger)
    const destroy = await client.delete(`/api/v1/scenes/${scene.id}`).loginAs(stranger)

    show.assertStatus(403)
    patch.assertStatus(403)
    destroy.assertStatus(403)
  })

  test('bumps version on every change, a rename included', async ({ client, assert }) => {
    const user = await createUser()

    const creation = await client
      .post('/api/v1/scenes')
      .json({ name: 'Clock', width: 64, height: 32 })
      .loginAs(user)

    const scene = sceneFrom(creation.body())

    const renamed = await client
      .patch(`/api/v1/scenes/${scene.id}`)
      .json({ name: 'Renamed' })
      .loginAs(user)

    assert.equal(sceneFrom(renamed.body()).version, 2)

    const reconfigured = await client
      .patch(`/api/v1/scenes/${scene.id}`)
      .json({ config: { version: 1, nodes: [{ type: 'text' }] } })
      .loginAs(user)

    assert.equal(sceneFrom(reconfigured.body()).version, 3)
  })

  test('leaves version alone when a patch changes nothing', async ({ client, assert }) => {
    const user = await createUser()

    const creation = await client
      .post('/api/v1/scenes')
      .json({ name: 'Clock', width: 64, height: 32, targetFps: 30 })
      .loginAs(user)

    const scene = sceneFrom(creation.body())

    /**
     * The edit sheet submits every field it renders, not only the dirty ones,
     * so resubmitting an untouched form must not inflate the version. The
     * `config` envelope is compared by value too, not by identity.
     */
    const resubmitted = await client
      .patch(`/api/v1/scenes/${scene.id}`)
      .json({
        name: 'Clock',
        width: 64,
        height: 32,
        targetFps: 30,
        config: { version: 1, nodes: [] },
      })
      .loginAs(user)

    assert.equal(sceneFrom(resubmitted.body()).version, 1)
  })

  test('rejects a patch that would push a merged geometry past the maximum', async ({
    client,
    assert,
  }) => {
    const user = await createUser()

    const creation = await client
      .post('/api/v1/scenes')
      .json({ name: 'Clock', width: 64, height: 32 })
      .loginAs(user)

    const scene = sceneFrom(creation.body())

    const response = await client
      .patch(`/api/v1/scenes/${scene.id}`)
      .json({ width: 2049 })
      .loginAs(user)

    response.assertStatus(422)

    const stored = await Scene.findOrFail(scene.id)
    assert.equal(stored.width, 64)
  })

  test('requires an authenticated user', async ({ client }) => {
    const response = await client.get('/api/v1/scenes')

    response.assertStatus(401)
  })
})
