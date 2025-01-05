import vine from '@vinejs/vine'
import { renderConfigSchema } from './render_config_validator.js'

export const editMatrixValidator = vine.compile(
  vine.object({
    name: vine.string().minLength(2).maxLength(255),
    width: vine.number().min(8).max(512),
    height: vine.number().min(8).max(512),
    config: renderConfigSchema.parse((value: unknown) => {
      if (typeof value === 'string') {
        return JSON.parse(value)
      }

      return value
    }),
  })
)
