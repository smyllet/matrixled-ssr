import MatrixEvent from '#events/base/matrix_event'

export default class MatrixDeleted extends MatrixEvent {
  readonly name = 'matrix.deleted' as const
}
