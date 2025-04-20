import vine from '@vinejs/vine'
import { Infer } from '@vinejs/vine/types'

const rendererTemplateSchemaBackground = vine
  .object({
    type: vine.enum(['gif', 'image', 'color']),
  })
  .merge(
    vine.group([
      vine.group.if((data) => data.type === 'gif' && data.asset !== undefined, {
        type: vine.literal('gif'),
        asset: vine.string(),
      }),
      vine.group.if((data) => data.type === 'image' && data.asset !== undefined, {
        type: vine.literal('image'),
        asset: vine.string(),
      }),
      vine.group.if((data) => data.type === 'color', {
        type: vine.literal('color'),
        color: vine.string(),
      }),
    ])
  )

export const rendererTemplateSchema = vine.object({
  background: rendererTemplateSchemaBackground,
  layers: vine.array(
    vine.object({
      type: vine.enum(['text']),
      text: vine.string(),
      x: vine.number(),
      y: vine.number(),
    })
  ),
})

export type RendererTemplate = Infer<typeof rendererTemplateSchema>

export const rendererAssetIdSchema = vine
  .string()
  .regex(/^@(system|local|matrix|panel)\/(gif|img)\/([a-z][a-zA-Z0-9]+)$/)

export const rendererAssetBase64Schema = vine.string().maxLength(2 ** 20)
export const rendererAssetSchema = vine.object({
  id: rendererAssetIdSchema,
  base64: rendererAssetBase64Schema,
})
export type RendererAsset = Infer<typeof rendererAssetSchema>
export const rendererAssetsSchema = vine.record(vine.string())

export type RendererAssets = Infer<typeof rendererAssetsSchema>
