import Matrix from '#models/matrix'

declare module '@adonisjs/core/types' {
  interface EventsList {
    'matrix:render:updated': Matrix
    'matrix:model:created': Matrix
    'matrix:model:updated': Matrix
    'matrix:model:deleted': Matrix
  }
}
