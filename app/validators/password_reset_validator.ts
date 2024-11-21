import vine from '@vinejs/vine'

export const passwordResetValidator = vine.compile(
  vine.object({
    token: vine.string(),
    password: vine.string().minLength(8),
  })
)
