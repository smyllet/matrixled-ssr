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
      })
      .prefix('matrices')
      .as('matrices')
      .use(middleware.auth())
  })
  .prefix('/api/v1')
