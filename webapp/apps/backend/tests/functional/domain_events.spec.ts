import MatrixCreated from '#events/matrix_created'
import MatrixDeleted from '#events/matrix_deleted'
import MatrixUpdated from '#events/matrix_updated'
import RendererCreated from '#events/renderer_created'
import RendererDeleted from '#events/renderer_deleted'
import RendererUpdated from '#events/renderer_updated'
import SceneCreated from '#events/scene_created'
import SceneDeleted from '#events/scene_deleted'
import SceneUpdated from '#events/scene_updated'
import Matrix from '#models/matrix'
import Renderer from '#models/renderer'
import { MatrixService } from '#services/matrix_service'
import { RendererService } from '#services/renderer_service'
import { SceneService } from '#services/scene_service'
import { TokenService } from '#services/token_service'
import { createUser } from '#tests/helpers'
import emitter from '@adonisjs/core/services/emitter'
import { test } from '@japa/runner'

test.group('Matrix events', () => {
  test('emits created, updated and deleted', async ({ assert }) => {
    using fakeEmitter = emitter.fake()
    const user = await createUser()
    const matrixService = new MatrixService()

    const matrix = await matrixService.createMatrix({
      name: 'Kitchen',
      width: 16,
      height: 16,
      userId: user.id,
    })

    fakeEmitter.assertEmitted(
      MatrixCreated,
      ({ data }) => data.userId === user.id && data.id === matrix.id
    )
    /**
     * The point of carrying the entity rather than only its id: a listener gets
     * the whole row without a second fetch. Read it here, before the next call
     * mutates the same in-memory instance — the event holds a live reference,
     * not a snapshot frozen at emission time.
     */
    assert.equal(fakeEmitter.find(MatrixCreated)?.data.matrix.name, 'Kitchen')

    await matrixService.patchMatrix(matrix, { name: 'Kitchen wall' })

    fakeEmitter.assertEmitted(
      MatrixUpdated,
      ({ data }) => data.userId === user.id && data.id === matrix.id
    )
    assert.equal(fakeEmitter.find(MatrixUpdated)?.data.matrix.name, 'Kitchen wall')

    await matrixService.deleteMatrix(matrix)

    fakeEmitter.assertEmitted(
      MatrixDeleted,
      ({ data }) => data.userId === user.id && data.id === matrix.id
    )
  })

  test('stays quiet when a patch changes nothing', async () => {
    const user = await createUser()
    const matrixService = new MatrixService()

    const matrix = await matrixService.createMatrix({
      name: 'Kitchen',
      width: 16,
      height: 16,
      userId: user.id,
    })

    using fakeEmitter = emitter.fake()

    await matrixService.patchMatrix(matrix, { name: 'Kitchen' })

    fakeEmitter.assertNotEmitted(MatrixUpdated)
  })
})

test.group('Scene events', () => {
  test('emits created and deleted', async () => {
    using fakeEmitter = emitter.fake()
    const user = await createUser()
    const sceneService = new SceneService()

    const scene = await sceneService.createScene({
      name: 'Clock',
      width: 64,
      height: 32,
      userId: user.id,
    })

    await sceneService.deleteScene(scene)

    fakeEmitter.assertEmitted(
      SceneCreated,
      ({ data }) => data.userId === user.id && data.id === scene.id
    )
    fakeEmitter.assertEmitted(
      SceneDeleted,
      ({ data }) => data.userId === user.id && data.id === scene.id
    )
  })

  test('emits updated only when the patch actually changes the scene', async () => {
    const user = await createUser()
    const sceneService = new SceneService()

    const scene = await sceneService.createScene({
      name: 'Clock',
      width: 64,
      height: 32,
      userId: user.id,
    })

    using fakeEmitter = emitter.fake()

    await sceneService.patchScene(scene, { name: 'Clock' })
    fakeEmitter.assertNotEmitted(SceneUpdated)

    await sceneService.patchScene(scene, { name: 'Living room clock' })
    fakeEmitter.assertEmitted(
      SceneUpdated,
      ({ data }) => data.userId === user.id && data.id === scene.id
    )
  })
})

test.group('Renderer events', () => {
  test('emits created, updated and deleted', async () => {
    using fakeEmitter = emitter.fake()
    const user = await createUser()
    const rendererService = new RendererService(new TokenService())

    const { renderer } = await rendererService.createRenderer({
      name: 'Living room renderer',
      ownerId: user.id,
    })

    await rendererService.patchRenderer(renderer, { name: 'Living room renderer v2' })
    await rendererService.rotateToken(renderer)
    await rendererService.deleteRenderer(renderer)

    fakeEmitter.assertEmitted(
      RendererCreated,
      ({ data }) => data.userId === user.id && data.id === renderer.id
    )
    fakeEmitter.assertEmittedCount(RendererUpdated, 2)
    fakeEmitter.assertEmitted(
      RendererDeleted,
      ({ data }) => data.userId === user.id && data.id === renderer.id
    )
  })

  test('stays quiet when a patch changes nothing', async () => {
    const user = await createUser()
    const rendererService = new RendererService(new TokenService())

    const { renderer } = await rendererService.createRenderer({
      name: 'Living room renderer',
      ownerId: user.id,
    })

    using fakeEmitter = emitter.fake()

    await rendererService.patchRenderer(renderer, { name: 'Living room renderer' })

    fakeEmitter.assertNotEmitted(RendererUpdated)
  })

  /**
   * The platform renderer belongs to nobody, and the service does not treat it
   * as a special case: the event carries a null `userId`, and skipping it is
   * the dashboard listener's decision alone (see
   * `tests/unit/broadcast_dashboard_event.spec.ts`). A listener recording
   * history must keep seeing it.
   */
  test('still emits for the ownerless platform renderer', async ({ assert }) => {
    const rendererService = new RendererService(new TokenService())
    const credential = await new TokenService().issue('renderer')

    const renderer = await Renderer.create({
      name: 'Platform renderer',
      ownerId: null,
      isDefault: true,
      tokenPrefix: credential.prefix,
      tokenHash: credential.hash,
    })

    using fakeEmitter = emitter.fake()

    await rendererService.patchRenderer(renderer, { name: 'Platform renderer v2' })

    fakeEmitter.assertEmitted(RendererUpdated, ({ data }) => data.id === renderer.id)
    assert.isNull(fakeEmitter.find(RendererUpdated)?.data.userId)
  })
})

test.group('Event listener failures', () => {
  /**
   * Services dispatch without awaiting, so an emitter that rethrows would turn
   * any broken listener into an unhandled rejection and a dead process. The
   * handler registered in `start/events.ts` is what stops that, and it is
   * otherwise invisible: this test is the only thing holding it in place.
   */
  test('reports a failing listener instead of taking the process down', async () => {
    const failing = () => {
      throw new Error('listener exploded')
    }

    emitter.on(MatrixCreated, failing)

    try {
      await MatrixCreated.dispatch(new Matrix())
    } finally {
      emitter.off(MatrixCreated, failing)
    }
  })
})
