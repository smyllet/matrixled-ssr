import vine from '@vinejs/vine'
import { Infer } from '@vinejs/vine/types'

export const rendererConfigSchema = vine.object({
  fontPath: vine.string(),
  background: vine.unionOfTypes([
    vine.object({
      type: vine.literal('gif'),
      base64: vine.string(),
    }),
    vine.object({
      type: vine.literal('image'),
      base64: vine.string(),
    }),
    vine.object({
      type: vine.literal('color'),
      color: vine.string(),
    }),
  ]),
  layers: vine.array(
    vine.object({
      type: vine.enum(['text']),
      text: vine.string(),
      x: vine.number(),
      y: vine.number(),
    })
  ),
})

export const rendererConfigValidator = vine.compile(rendererConfigSchema)

export type RendererConfig = Infer<typeof rendererConfigSchema>
