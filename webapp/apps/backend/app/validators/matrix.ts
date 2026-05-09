import vine from '@vinejs/vine'

const name = () => vine.string().minLength(3).maxLength(100)
const config = () => vine.record(vine.any())

export const showMatrixValidator = vine.create({
  params: vine.object({
    id: vine.string().uuid(),
  }),
})

export const createMatrixValidator = vine.create({
  name: name(),
  width: vine.number().positive().decimal(0).max(128),
  height: vine.number().positive().decimal(0).max(128),
})

export const patchMatrixValidator = vine.create({
  params: vine.object({
    id: vine.string().uuid(),
  }),
  name: name().optional(),
  config: config().optional(),
})

export const deleteMatrixValidator = vine.create({
  params: vine.object({
    id: vine.string().uuid(),
  }),
})
