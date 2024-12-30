import Matrix from '#models/matrix'
import RendererService from '#services/renderer_service'
import { createMatrixValidator } from '#validators/create_matrix_validator'
import { editMatrixValidator } from '#validators/edit_matrix_validator'
import type { HttpContext } from '@adonisjs/core/http'

export default class MatricesController {
  /**
   * Display a list of resource
   */
  async index({}: HttpContext) {}

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

    return response.redirect().toRoute('home')
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
  async edit({ inertia, params }: HttpContext) {
    const matrix = await Matrix.findOrFail(params.id)

    return inertia.render('matrices/edit', { matrix: matrix.serialize() })
  }

  /**
   * Handle form submission for the edit action
   */
  async update({ params, request, response, session }: HttpContext) {
    const { name, width, height, config } = await request.validateUsing(editMatrixValidator)

    const matrix = await Matrix.findOrFail(params.id)

    matrix.merge({ name, width, height, config: JSON.stringify(config, null, 2) })

    await matrix.save()

    session.flash('notification', {
      type: 'success',
      message: 'Matrix updated successfully',
    })

    return response.redirect().toRoute('matrices.edit', { id: matrix.id })
  }

  /**
   * Delete record
   */
  async destroy({}: HttpContext) {}

  /**
   * Render matrix
   */
  async render({ params, response, auth }: HttpContext) {
    const matrix = await auth
      .getUserOrFail()
      .related('matrices')
      .query()
      .where('id', params.id)
      .firstOrFail()

    const gif = RendererService.getRender(matrix)

    response.header('Content-Type', 'image/gif')
    response.send(gif)
  }

  /**
   * Render matrix of token
   */
  async renderToken({ request, response }: HttpContext) {
    const token = request.header('token')

    if (!token) {
      return 'Token not found'
    }

    const matrix = await Matrix.query().where('token', token).firstOrFail()

    const gif = RendererService.getRender(matrix)

    response.header('Content-Type', 'image/gif')
    response.send(gif)
  }
}
