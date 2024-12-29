import Matrix from '#models/matrix'

declare module '@adonisjs/core/types' {
  interface EventsList {
    'matrix:render:updated': Matrix
  }
}
