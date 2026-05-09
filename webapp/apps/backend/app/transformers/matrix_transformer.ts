import { BaseTransformer } from '@adonisjs/core/transformers'
import type Matrix from '#models/matrix'

export default class MatrixTransformer extends BaseTransformer<Matrix> {
  toObject() {
    return this.pick(this.resource, [
      'id',
      'name',
      'width',
      'height',
      'config',
      'userId',
      'createdAt',
      'updatedAt',
    ])
  }
}
