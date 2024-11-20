import UserToken from '#models/user_token'
import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'

export default class EmailVerificationController {
  async verify({ request, session, response }: HttpContext) {
    const { token } = request.qs()

    const validatedToken = await vine
      .compile(vine.string())
      .validate(token)
      .catch(() => null)

    if (!validatedToken) {
      session.flashErrors({
        E_EMAIL_VERIFICATION_TOKEN: 'Missing verification token',
      })
      return response.redirect().toPath('/auth/login')
    }

    const user = await UserToken.getEmailVerificationUser(validatedToken)

    if (user) {
      user.verified = true
      await user.save()

      await UserToken.deleteUserEmailVerificationTokens(user)

      session.flash('notification', {
        type: 'success',
        message: 'Email verified successfully',
      })
    } else {
      session.flashErrors({
        E_EMAIL_VERIFICATION_TOKEN:
          'Invalid or expired token, try to connect again for receiving a new one',
      })
    }
    return response.redirect().toPath('/auth/login')
  }
}
