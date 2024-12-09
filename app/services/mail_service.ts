import User from '#models/user'
import UserToken from '#models/user_token'
import env from '#start/env'
import Router from '@adonisjs/core/services/router'
import mail from '@adonisjs/mail/services/main'

export default class MailService {
  async sendEmailVerification(user: User, token: UserToken) {
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
  }
}
