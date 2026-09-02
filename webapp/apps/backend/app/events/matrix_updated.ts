import MatrixEvent from '#events/base/matrix_event'

export default class MatrixUpdated extends MatrixEvent {
  readonly name = 'matrix.updated' as const
}
