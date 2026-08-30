import vine from '@vinejs/vine'

const name = () => vine.string().minLength(3).maxLength(100)

/**
 * `version`, `capabilities`, `endpoint`, `status` and `lastSeenAt` are declared
 * by the renderer on the control plane or derived from its connection. None of
 * them is accepted from an HTTP request. See docs/DATA-MODEL.md.
 */
export const showRendererValidator = vine.create({
  params: vine.object({
    id: vine.string().uuid(),
  }),
})

export const createRendererValidator = vine.create({
  name: name(),
})

export const patchRendererValidator = vine.create({
  params: vine.object({
    id: vine.string().uuid(),
  }),
  name: name().optional(),
})

export const deleteRendererValidator = vine.create({
  params: vine.object({
    id: vine.string().uuid(),
  }),
})

export const rotateRendererTokenValidator = vine.create({
  params: vine.object({
    id: vine.string().uuid(),
  }),
})
