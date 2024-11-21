import type { HttpContext } from '@adonisjs/core/http'

export default class LogoutController {
  /**
   * Handle form submission for the logout action
   */
  async store({ auth, response }: HttpContext) {
    await auth.use('web').logout()

    return response.redirect('/auth/login')
  }
}
