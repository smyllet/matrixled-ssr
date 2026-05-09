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
    return Matrix.create({ name, width, height, userId, config: DEFAULT_MATRIX_CONFIG })
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

    await matrix.save()

    return matrix
  }

  async deleteMatrix(matrix: Matrix) {
    await matrix.delete()
  }
}
