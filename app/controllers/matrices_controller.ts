import Matrix from '#models/matrix'
import { RendererService } from '#services/renderer_service'
import { createMatrixValidator } from '#validators/create_matrix_validator'
import { editMatrixValidator } from '#validators/edit_matrix_validator'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class MatricesController {
  constructor(private renderer: RendererService) {}

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
  async edit({ inertia, params, auth }: HttpContext) {
    const matrix = await auth
      .getUserOrFail()
      .related('matrices')
      .query()
      .where('id', params.id)
      .firstOrFail()

    return inertia.render('matrices/edit', { matrix: matrix.serialize() })
  }

  /**
   * Handle form submission for the edit action
   */
  async update({ params, request, response, session, auth }: HttpContext) {
    const { name, width, height, config } = await request.validateUsing(editMatrixValidator)

    const matrix = await auth
      .getUserOrFail()
      .related('matrices')
      .query()
      .where('id', params.id)
      .firstOrFail()

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
  async destroy({ params, response, auth }: HttpContext) {
    const matrix = await auth
      .getUserOrFail()
      .related('matrices')
      .query()
      .where('id', params.id)
      .firstOrFail()

    await matrix.delete()

    return response.redirect().toRoute('home')
  }

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

    const gif = this.renderer.getRender(matrix)

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

    const gif = this.renderer.getRender(matrix)

    response.header('Content-Type', 'image/gif')
    response.send(gif)
  }
}
