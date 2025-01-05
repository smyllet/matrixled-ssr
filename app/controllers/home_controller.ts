import { HttpContext } from '@adonisjs/core/http'

export default class HomeController {
  async index({ inertia, auth }: HttpContext) {
    const matrices = await auth.getUserOrFail().related('matrices').query()

    return inertia.render('home', {
      matrices: matrices.map((matrix) => matrix.serialize()),
    })
  }
}
