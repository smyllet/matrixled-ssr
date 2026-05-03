import User from '#models/user'
import UserTransformer from '#transformers/user_transformer'
import { loginValidator } from '#validators/user'
import type { HttpContext } from '@adonisjs/core/http'

export default class SessionController {
  async store({ request, auth, serialize }: HttpContext) {
    const { email, password } = await request.validateUsing(loginValidator)

    const user = await User.verifyCredentials(email, password)

    await auth.use('web').login(user)

    return serialize(UserTransformer.transform(user))
  }
}
