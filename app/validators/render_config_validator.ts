import { rendererAssetSchema, rendererTemplateSchema } from '@matrixled-ssr/renderer'
import vine from '@vinejs/vine'
import { Infer } from '@vinejs/vine/types'

const renderConfigPanelSchema = vine
  .object({
    type: vine.enum(['hardCodedGif', 'renderer']),
    duration: vine.number().min(1).optional(),
  })
  .merge(
    vine.group([
      vine.group.if((data) => data.type === 'hardCodedGif', {
        type: vine.literal('hardCodedGif'),
        gifName: vine.enum(['tardis', 'life', 'homer', 'pacman', 'pacman2']),
      }),
      vine.group.if((data) => data.type === 'renderer', {
        type: vine.literal('renderer'),
        template: rendererTemplateSchema,
        assets: vine
          .array(
            vine.object({
              ...rendererAssetSchema.getProperties(),
              // id: rendererAssetIdSchema.startsWith('@panel/'),
            })
          )
          .optional(),
      }),
    ])
  )

export const renderConfigSchema = vine.object({
  version: vine.literal(1),
  duration: vine.number().min(1).optional(),
  assets: vine
    .array(
      vine.object({
        ...rendererAssetSchema.getProperties(),
        // id: rendererAssetIdSchema.startsWith('@matrix/'),
      })
    )
    .optional(),
  panels: vine.array(renderConfigPanelSchema),
})

export const renderConfigValidator = vine.compile(renderConfigSchema)

export type RenderConfig = Infer<typeof renderConfigSchema>
