import User from '#models/user'
import { loginValidator } from '#validators/login_validator'
import type { HttpContext } from '@adonisjs/core/http'

export default class LoginController {
  /**
   * Display the login form
   */
  async index({ inertia }: HttpContext) {
    return inertia.render('auth/login')
  }

  /**
   * Handle form submission for the login action
   */
  async store({ request, auth, response }: HttpContext) {
    const { email, password, rememberMe } = await request.validateUsing(loginValidator)

    const user = await User.verifyCredentials(email, password)

    await auth.use('web').login(user, rememberMe)

    return response.redirect('/')
  }
}
