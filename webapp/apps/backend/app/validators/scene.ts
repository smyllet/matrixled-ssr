import vine from '@vinejs/vine'
import type { Infer } from '@vinejs/vine/types'

const name = () => vine.string().minLength(3).maxLength(100)
const dimension = () => vine.number().positive().withoutDecimals()
const targetFps = () => vine.number().min(1).max(60)

/**
 * The node catalogue is intentionally open (docs/DATA-MODEL.md § Scene): no
 * primitive exists yet. A node is only required to be a tagged object — every
 * future primitive discriminates on `type`, the rest of its shape is unknown
 * to this envelope on purpose, so adding a primitive never requires touching
 * it.
 */
const sceneNode = () => vine.object({ type: vine.string().minLength(1) }).allowUnknownProperties()

export const sceneConfigSchema = vine.object({
  version: vine.literal(1),
  nodes: vine.array(sceneNode()),
})

export const sceneConfigValidator = vine.compile(sceneConfigSchema)

export type SceneConfig = Infer<typeof sceneConfigSchema>

/**
 * `width` and `height` are independently optional on a patch, so this rule
 * only ever runs where both are guaranteed present: on create, and again in
 * SceneService.patchScene against the row's merged geometry. It cannot live
 * solely on `patchSceneValidator`, which never sees the unpatched sibling
 * field.
 */
const boundedByProtocolMaximum = vine.createRule<undefined>((value, _options, field) => {
  const { width, height } = value as { width: number; height: number }

  if (width * height > 65536) {
    field.report(
      'The scene geometry ({{ width }}x{{ height }}) exceeds the protocol maximum of 65536 pixels',
      'boundedByProtocolMaximum',
      field
    )
  }
})

export const sceneGeometrySchema = vine
  .object({
    width: dimension(),
    height: dimension(),
  })
  .use(boundedByProtocolMaximum())

/**
 * `version` on the row and `status`-like observed fields don't exist on
 * Scene: everything here is genuinely settable by the owner.
 */
export const showSceneValidator = vine.create({
  params: vine.object({
    id: vine.string().uuid(),
  }),
})

export const createSceneValidator = vine.create(
  vine
    .object({
      name: name(),
      width: dimension(),
      height: dimension(),
      targetFps: targetFps().optional(),
      config: sceneConfigSchema.optional(),
    })
    .use(boundedByProtocolMaximum())
)

export const patchSceneValidator = vine.create({
  params: vine.object({
    id: vine.string().uuid(),
  }),
  name: name().optional(),
  width: dimension().optional(),
  height: dimension().optional(),
  targetFps: targetFps().optional(),
  config: sceneConfigSchema.optional(),
})

export const deleteSceneValidator = vine.create({
  params: vine.object({
    id: vine.string().uuid(),
  }),
})
