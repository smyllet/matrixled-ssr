// import type { HttpContext } from '@adonisjs/core/http'

import MatrixPolicy from '#policies/matrix_policy'
import { MatrixService } from '#services/matrix_service'
import MatrixTransformer from '#transformers/matrix_transformer'
import {
  createMatrixValidator,
  deleteMatrixValidator,
  patchMatrixValidator,
} from '#validators/matrix'
import { inject } from '@adonisjs/core'
import { type HttpContext } from '@adonisjs/core/http'

@inject()
export default class MatricesController {
  constructor(protected matrixService: MatrixService) {}

  async index({ auth, serialize }: HttpContext) {
    const user = auth.getUserOrFail()

    const matrices = await this.matrixService.getAllUserMatrices(user.id)

    return serialize(MatrixTransformer.transform(matrices))
  }

  async show({ params, serialize, bouncer }: HttpContext) {
    const { id: matrixId } = params

    const matrix = await this.matrixService.getMatrixById(matrixId)

    await bouncer.with(MatrixPolicy).authorize('show', matrix)

    return serialize(MatrixTransformer.transform(matrix))
  }

  async store({ auth, request, serialize }: HttpContext) {
    const { name, width, height } = await request.validateUsing(createMatrixValidator)

    const user = auth.getUserOrFail()

    const matrix = await this.matrixService.createMatrix({ name, width, height, userId: user.id })

    return serialize(MatrixTransformer.transform(matrix))
  }

  async patch({ request, serialize, bouncer }: HttpContext) {
    const {
      params: { id: matrixId },
      name,
      config,
    } = await request.validateUsing(patchMatrixValidator)

    const matrix = await this.matrixService.getMatrixById(matrixId)

    await bouncer.with(MatrixPolicy).authorize('patch', matrix)

    const updatedMatrix = await this.matrixService.patchMatrix(matrix, { name, config })

    return serialize(MatrixTransformer.transform(updatedMatrix))
  }

  async delete({ request, bouncer }: HttpContext) {
    const {
      params: { id: matrixId },
    } = await request.validateUsing(deleteMatrixValidator)

    const matrix = await this.matrixService.getMatrixById(matrixId)

    await bouncer.with(MatrixPolicy).authorize('delete', matrix)

    await this.matrixService.deleteMatrix(matrix)
  }
}
