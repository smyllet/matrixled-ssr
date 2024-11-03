/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
const TestsController = () => import('#controllers/tests_controller')

router.on('/').renderInertia('home')
router.get('test', [TestsController, 'index'])
