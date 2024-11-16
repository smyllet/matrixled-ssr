import User from '#models/user'
import { createRegisterValidator } from '#validators/register_validator'
import type { HttpContext } from '@adonisjs/core/http'

export default class RegisterController {
  /**
   * Display the registration form
   */
  async index({ inertia }: HttpContext) {
    return inertia.render('auth/register')
  }

  /**
   * Handle form submission for the create action
   */
  async store({ request, response }: HttpContext) {
    const { fullName, email, password } = await request.validateUsing(createRegisterValidator)

    await User.create({ fullName, email, password })

    return response.redirect().toPath('/auth/login')
  }
}
