import vine from '@vinejs/vine'

export const createMatrixValidator = vine.compile(
  vine.object({
    name: vine.string().minLength(2).maxLength(255),
    width: vine.number().min(8).max(512),
    height: vine.number().min(8).max(512),
  })
)
