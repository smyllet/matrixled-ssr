/*
|--------------------------------------------------------------------------
| Transmit (SSE) channels
|--------------------------------------------------------------------------
|
| @adonisjs/transmit does not expose a config option to protect its own
| routes — `registerRoutes` takes the route modifier as an argument, not
| `config/transmit.ts`. All three routes go through the session guard: an
| unauthenticated `__transmit/events` would let anyone open a stream.
|
*/

import { authorizePlatformChannel, authorizeUserChannel } from '#channels/dashboard_channel'
import { middleware } from '#start/kernel'
import transmit from '@adonisjs/transmit/services/main'

transmit.registerRoutes((route) => {
  route.use(middleware.auth())
})

transmit.authorize<{ id: string }>('users/:id', authorizeUserChannel)
transmit.authorize('platform', authorizePlatformChannel)
