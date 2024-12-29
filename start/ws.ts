import { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import emitter from '@adonisjs/core/services/emitter'
import logger from '@adonisjs/core/services/logger'
import server from '@adonisjs/core/services/server'
import { server as WebSocketServer } from 'websocket'

function originIsAllowed(origin: string) {
  // put logic here to detect whether the specified origin is allowed.
  return true
}

app.ready(() => {
  const nodeServer = server.getNodeServer()
  if (!nodeServer) return

  const wsServer = new WebSocketServer({
    httpServer: nodeServer,
    autoAcceptConnections: false,
  })

  wsServer.on('request', (request) => {
    if (!originIsAllowed(request.origin)) {
      // Make sure we only accept requests from an allowed origin
      request.reject()
      logger.info('Connection from origin ' + request.remoteAddress + ' rejected.')
      return
    }

    const connection = request.accept(null, request.origin)
    logger.info('Connection from origin ' + request.remoteAddress + ' accepted.')

    emitter.on('matrix:render:updated', (matrix) => {
      wsServer.broadcastUTF(JSON.stringify({ type: 'matrix:render:updated', matrixId: matrix.id }))
    })

    connection.on('message', function (message) {
      if (message.type === 'utf8') {
        console.log('Received Message: ' + message.utf8Data)
        connection.sendUTF(message.utf8Data)
      }
    })
    connection.on('close', function () {
      logger.info('Peer ' + request.remoteAddress + ' disconnected.')
    })
  })
})
