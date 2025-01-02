import transmit from '@adonisjs/transmit/services/main'
import type { HttpContext } from '@adonisjs/core/http'
import Matrix from '#models/matrix'
import emitter from '@adonisjs/core/services/emitter'
import app from '@adonisjs/core/services/app'

transmit.authorize<{ id: string }>('matrix/:id/render', async (ctx: HttpContext, { id }) => {
  const user = ctx.auth.getUserOrFail()
  const matrix = await Matrix.query().where('id', id).where('user_id', user.id).firstOrFail()

  return matrix.userId === user.id
})

app.start(async () => {
  emitter.on('matrix:render:updated', (matrix) => {
    transmit.broadcast(`matrix/${matrix.id}/render`, {
      matrixId: matrix.id,
    })
  })
})
