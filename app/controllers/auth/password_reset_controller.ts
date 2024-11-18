import User from '#models/user'
import UserToken from '#models/user_token'
import env from '#start/env'
import { passwordForgotValidator } from '#validators/password_forgot_validator'
import { passwordResetValidator } from '#validators/password_reset_validator'
import { type HttpContext } from '@adonisjs/core/http'
import Router from '@adonisjs/core/services/router'
import mail from '@adonisjs/mail/services/main'

export default class PasswordResetController {
  async forgot({ inertia, request }: HttpContext) {
    return inertia.render('auth/password/forgot', {
      success: !!request.qs().success,
    })
  }

  async send({ request, response }: HttpContext) {
    const { email } = await request.validateUsing(passwordForgotValidator)

    const user = await User.findBy('email', email)

    if (user) {
      const token = await UserToken.generatePasswordResetToken(user)

      const resetLink = Router.makeUrl('auth.password.reset', undefined, {
        qs: { token: token.token },
        prefixUrl: env.get('BASE_URL').replace(/\/$/, ''),
      })

      await mail.sendLater((message) => {
        message.to(user.email).subject('Password reset').text(`Reset your password: ${resetLink}`)
      })
    }

    return response.redirect().withQs({ success: true }).back()
  }

  async reset({ inertia, request }: HttpContext) {
    return inertia.render('auth/password/reset', {
      token: request.qs().token,
    })
  }

  async store({ request, response, session }: HttpContext) {
    const { token, password } = await request.validateUsing(passwordResetValidator)

    const user = await UserToken.getPasswordResetUser(token)

    if (!user) {
      session.flash('errors', {
        token: ['Invalid or expired token'],
      })
      session.flashAll()
      return response.redirect().back()
    }

    user.password = password
    await user.save()

    await UserToken.deleteUserPasswordResetTokens(user)

    mail.sendLater((message) => {
      message.to(user.email).subject('Password reset').text('Your password has been reset')
    })

    return response.redirect().toPath('/auth/login')
  }
}
