import { createMatrixValidator } from '#validators/create_matrix_validator'
import type { HttpContext } from '@adonisjs/core/http'

export default class MatricesController {
  /**
   * Display a list of resource
   */
  async index({ inertia }: HttpContext) {}

  /**
   * Display form to create a new record
   */
  async create({ inertia }: HttpContext) {
    return inertia.render('matrices/create')
  }

  /**
   * Handle form submission for the create action
   */
  async store({ request, auth, session, response }: HttpContext) {
    const { name, width, height } = await request.validateUsing(createMatrixValidator)

    await auth.getUserOrFail().related('matrices').create({ name, width, height })

    session.flash('notification', {
      type: 'success',
      message: 'Matrix created successfully',
    })

    return response.redirect().toRoute('matrices.create')
  }

  /**
   * Show individual record
   */
  async show({ params }: HttpContext) {
    return { id: params.id }
  }

  /**
   * Edit individual record
   */
  async edit({ params }: HttpContext) {}

  /**
   * Handle form submission for the edit action
   */
  async update({ params }: HttpContext) {}

  /**
   * Delete record
   */
  async destroy({ params }: HttpContext) {}
}
