import vine from '@vinejs/vine'

export const passwordForgotValidator = vine.compile(
  vine.object({
    email: vine.string().email().normalizeEmail(),
  })
)
