import type User from '#models/user'
import type Device from '#models/device'
import { BasePolicy } from '@adonisjs/bouncer'
import type { AuthorizerResponse } from '@adonisjs/bouncer/types'

export default class DevicePolicy extends BasePolicy {
  show(user: User, device: Device): AuthorizerResponse {
    return user.id === device.userId
  }

  patch(user: User, device: Device): AuthorizerResponse {
    return user.id === device.userId
  }

  delete(user: User, device: Device): AuthorizerResponse {
    return user.id === device.userId
  }
}
