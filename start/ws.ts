import Matrix from '#models/matrix'
import app from '@adonisjs/core/services/app'
import emitter from '@adonisjs/core/services/emitter'
import logger from '@adonisjs/core/services/logger'
import server from '@adonisjs/core/services/server'
import { request as WebSocketRequest, server as WebSocketServer } from 'websocket'

async function getMatrixFromConnection(request: WebSocketRequest) {
  const token = request.httpRequest.headers['token']

  if (!token) {
    return null
  }
  const matrix = await Matrix.query().where('token', token).first()

  return matrix
}

app.ready(async () => {
  const nodeServer = server.getNodeServer()
  if (!nodeServer) return

  const wsServer = new WebSocketServer({
    httpServer: nodeServer,
    autoAcceptConnections: false,
  })

  wsServer.on('request', async (request) => {
    const matrix = await getMatrixFromConnection(request)

    if (matrix === null) {
      request.reject()
      logger.warn('WebSocket connection from origin ' + request.remoteAddress + ' rejected.')
      return
    }

    const connection = request.accept(null, request.origin)

    logger.info('Connection from origin ' + request.remoteAddress + ' accepted.')

    emitter.on('matrix:render:updated', (matrixUpdated) => {
      if (matrixUpdated.id !== matrix.id) return

      connection.sendUTF(JSON.stringify({ type: 'matrix:render:updated' }))
    })

    connection.on('close', function () {
      logger.info('Peer ' + request.remoteAddress + ' disconnected.')
    })
  })
})
