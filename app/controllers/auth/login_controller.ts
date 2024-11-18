import User from '#models/user'
import UserToken from '#models/user_token'
import env from '#start/env'
import { loginValidator } from '#validators/login_validator'
import type { HttpContext } from '@adonisjs/core/http'
import Router from '@adonisjs/core/services/router'
import mail from '@adonisjs/mail/services/main'

export default class LoginController {
  /**
   * Display the login form
   */
  async index({ inertia }: HttpContext) {
    return inertia.render('auth/login')
  }

  /**
   * Handle form submission for the login action
   */
  async store({ request, auth, response, session }: HttpContext) {
    const { email, password, rememberMe } = await request.validateUsing(loginValidator)

    const user = await User.verifyCredentials(email, password)

    if (!user.verified) {
      const token = await UserToken.generateEmailVerificationToken(user)

      const verificationLink = Router.makeUrl('auth.email.verify', undefined, {
        qs: { token: token.token },
        prefixUrl: env.get('BASE_URL').replace(/\/$/, ''),
      })

      await mail.sendLater((message) => {
        message
          .to(user.email)
          .subject('Email verification')
          .text(`Verify your email: ${verificationLink}`)
      })

      session.flashErrors({
        E_EMAIL_VERIFICATION_TOKEN:
          'Email not verified, check your inbox for the verification link',
      })

      return response.redirect().back()
    }

    await auth.use('web').login(user, rememberMe)

    return response.redirect('/')
  }
}
