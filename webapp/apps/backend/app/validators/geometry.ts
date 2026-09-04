import { PROTOCOL_MAXIMUM_PIXELS } from '#constants/protocol'
import vine from '@vinejs/vine'

/**
 * Shared by scenes and devices: both carry a geometry the 16-bit pixel index
 * of the device protocol has to address, so both are bounded by the same
 * number.
 *
 * `width` and `height` are independently optional on a patch, so this rule
 * only ever runs where both are guaranteed present: on create, and again in
 * the services against the row's merged geometry. It cannot live solely on a
 * patch validator, which never sees the unpatched sibling field.
 */
export const boundedByProtocolMaximum = vine.createRule<undefined>((value, _options, field) => {
  const { width, height } = value as { width: number; height: number }

  if (width * height > PROTOCOL_MAXIMUM_PIXELS) {
    field.report(
      'The geometry ({{ width }}x{{ height }}) exceeds the protocol maximum of {{ maximum }} pixels',
      'boundedByProtocolMaximum',
      field,
      { width, height, maximum: PROTOCOL_MAXIMUM_PIXELS }
    )
  }
})
