import { BaseTransformer } from '@adonisjs/core/transformers'
import type Scene from '#models/scene'

export default class SceneTransformer extends BaseTransformer<Scene> {
  toObject() {
    return this.pick(this.resource, [
      'id',
      'name',
      'userId',
      'width',
      'height',
      'targetFps',
      'config',
      'version',
      'createdAt',
      'updatedAt',
    ])
  }
}
