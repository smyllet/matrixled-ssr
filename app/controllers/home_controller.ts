import { HttpContext } from '@adonisjs/core/http'

export default class HomeController {
  async index({ inertia, auth }: HttpContext) {
    return inertia.render('home', { user: { name: auth.user?.fullName } })
  }
}
