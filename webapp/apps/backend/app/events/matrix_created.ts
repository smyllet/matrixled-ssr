import MatrixEvent from '#events/base/matrix_event'

export default class MatrixCreated extends MatrixEvent {
  readonly name = 'matrix.created' as const
}
