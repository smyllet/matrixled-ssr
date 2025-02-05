import vine from '@vinejs/vine'
import { Infer } from '@vinejs/vine/types'

export const renderConfigSchema = vine.object({
  version: vine.literal(1),
  duration: vine.number().min(1).optional(),
  panels: vine.array(
    vine.object({
      type: vine.literal('hardCodedGif'),
      gifName: vine.string().in(['tardis', 'life', 'homer', 'pacman']),
      duration: vine.number().min(1).optional(),
    })
  ),
})

export const renderConfigValidator = vine.compile(renderConfigSchema)

export type RenderConfig = Infer<typeof renderConfigSchema>
