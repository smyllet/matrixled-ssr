import app from '@adonisjs/core/services/app'
import server from '@adonisjs/core/services/server'
import { server as WebSocketServer } from 'websocket'

function originIsAllowed(origin: string) {
  // put logic here to detect whether the specified origin is allowed.
  return true
}

app.ready(() => {
  const wsServer = new WebSocketServer({
    httpServer: server.getNodeServer()!,
    autoAcceptConnections: false,
  })

  wsServer.on('request', (request) => {
    if (!originIsAllowed(request.origin)) {
      // Make sure we only accept requests from an allowed origin
      request.reject()
      console.log(new Date() + ' Connection from origin ' + request.origin + ' rejected.')
      return
    }

    const connection = request.accept(null, request.origin)
    console.log(new Date() + ' Connection accepted.')

    connection.on('message', function (message) {
      if (message.type === 'utf8') {
        console.log('Received Message: ' + message.utf8Data)
        connection.sendUTF(message.utf8Data)

        if (message.utf8Data.startsWith('gif:')) {
          app.config.set('testGif', message.utf8Data.split(':')[1])
          wsServer.broadcastUTF('newRender')
        }
      }
    })
    connection.on('close', function () {
      console.log(new Date() + ' Peer ' + connection.remoteAddress + ' disconnected.')
    })
  })
})
