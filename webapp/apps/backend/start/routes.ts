/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'
import { controllers } from '#generated/controllers'

router.get('/', () => {
  return { hello: 'world' }
})

router
  .group(() => {
    router
      .group(() => {
        router.post('signup', [controllers.NewAccount, 'store'])
        router.post('login', [controllers.Session, 'store'])
      })
      .prefix('auth')
      .as('auth')

    router
      .group(() => {
        router.get('profile', [controllers.Profile, 'show'])
        router.post('logout', [controllers.Session, 'destroy'])
      })
      .prefix('account')
      .as('profile')
      .use(middleware.auth())

    router
      .group(() => {
        router.get('/', [controllers.Matrices, 'index']).as('index')
        router.get('/:id', [controllers.Matrices, 'show']).as('show')
        router.post('/', [controllers.Matrices, 'store']).as('store')
        router.patch('/:id', [controllers.Matrices, 'patch']).as('patch')
        router.delete('/:id', [controllers.Matrices, 'delete']).as('delete')
      })
      .prefix('matrices')
      .as('matrices')
      .use(middleware.auth())

    router
      .group(() => {
        router.get('/', [controllers.Renderers, 'index']).as('index')
        router.get('/:id', [controllers.Renderers, 'show']).as('show')
        router.post('/', [controllers.Renderers, 'store']).as('store')
        router.patch('/:id', [controllers.Renderers, 'patch']).as('patch')
        router.delete('/:id', [controllers.Renderers, 'delete']).as('delete')
        router.post('/:id/token', [controllers.Renderers, 'rotateToken']).as('token')
      })
      .prefix('renderers')
      .as('renderers')
      .use(middleware.auth())

    router
      .group(() => {
        router.get('/', [controllers.Scenes, 'index']).as('index')
        router.get('/:id', [controllers.Scenes, 'show']).as('show')
        router.post('/', [controllers.Scenes, 'store']).as('store')
        router.patch('/:id', [controllers.Scenes, 'patch']).as('patch')
        router.delete('/:id', [controllers.Scenes, 'delete']).as('delete')
      })
      .prefix('scenes')
      .as('scenes')
      .use(middleware.auth())
  })
  .prefix('/api/v1')
