import DomainEvent from '#events/base/domain_event'
import type Matrix from '#models/matrix'

/**
 * `matrix` is a live reference, not a snapshot: a listener sees whatever the
 * instance holds when it runs, a later mutation from the same request included,
 * and a deleted matrix is still readable in memory but must not be saved or
 * queried through. Read what you need synchronously.
 */
export default abstract class MatrixEvent extends DomainEvent {
  constructor(public matrix: Matrix) {
    super()
  }

  get userId() {
    return this.matrix.userId
  }

  get id() {
    return this.matrix.id
  }
}
