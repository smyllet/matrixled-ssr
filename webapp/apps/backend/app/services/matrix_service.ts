import MatrixCreated from '#events/matrix_created'
import MatrixDeleted from '#events/matrix_deleted'
import MatrixUpdated from '#events/matrix_updated'
import Matrix from '#models/matrix'

const DEFAULT_MATRIX_CONFIG = {}

export class MatrixService {
  async getAllUserMatrices(userId: string) {
    return Matrix.query().where('user_id', userId)
  }

  async getMatrixById(matrixId: string) {
    return Matrix.findOrFail(matrixId)
  }

  async createMatrix({
    name,
    width,
    height,
    userId,
  }: {
    name: string
    width: number
    height: number
    userId: string
  }) {
    const matrix = await Matrix.create({
      name,
      width,
      height,
      userId,
      config: DEFAULT_MATRIX_CONFIG,
    })

    MatrixCreated.dispatch(matrix)

    return matrix
  }

  async patchMatrix(
    matrix: Matrix,
    {
      name,
      config,
    }: Partial<{
      name: string
      config: Object
    }>
  ) {
    matrix.name = name ?? matrix.name
    matrix.config = config ?? matrix.config

    /**
     * Read before `save()`, which resets the tracking. A client resubmitting an
     * unchanged form — the edit sheet does — must not wake every open tab for a
     * refetch that would return the row it already holds.
     */
    const modified = matrix.$isDirty

    await matrix.save()

    if (modified) {
      MatrixUpdated.dispatch(matrix)
    }

    return matrix
  }

  async deleteMatrix(matrix: Matrix) {
    await matrix.delete()

    MatrixDeleted.dispatch(matrix)
  }
}
