/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import { middleware } from './kernel.js'

router.get('', [() => import('#controllers/home_controller'), 'index']).use(middleware.auth())

const LoginController = () => import('#controllers/auth/login_controller')
router.resource('auth/login', LoginController).only(['index', 'store']).use('*', middleware.guest())

const LogoutController = () => import('#controllers/auth/logout_controller')
router.resource('auth/logout', LogoutController).only(['store']).use('*', middleware.auth())

const RegisterController = () => import('#controllers/auth/register_controller')
router
  .resource('auth/register', RegisterController)
  .only(['index', 'store'])
  .use('*', middleware.guest())
