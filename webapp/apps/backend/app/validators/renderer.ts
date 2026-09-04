import { RENDERER_ENDPOINT_MAXIMUM_LENGTH, RENDERER_MAXIMUM_ENDPOINTS } from '#constants/renderer'
import vine from '@vinejs/vine'
import type { Infer } from '@vinejs/vine/types'

const name = () => vine.string().minLength(3).maxLength(100)

/**
 * The transports a renderer announces itself on, bounded before persistence:
 * it is untrusted input, and Adonis cannot probe a NATed renderer to check
 * what it claims (docs/adr/0016-transports-declares-par-le-renderer.md).
 *
 * `require_tld` is off so that `ws://localhost:8889` — a renderer sharing the
 * host — is a legal declaration.
 *
 * A factory, like every other reusable piece here: a schema instance carries
 * the rules applied to it, so sharing one across validators shares state that
 * is meant to be per-validator.
 */
const rendererEndpoints = () =>
  vine
    .array(
      vine
        .string()
        .maxLength(RENDERER_ENDPOINT_MAXIMUM_LENGTH)
        .url({ protocols: ['ws', 'wss'], require_protocol: true, require_tld: false })
    )
    .minLength(1)
    .maxLength(RENDERER_MAXIMUM_ENDPOINTS)

/**
 * Types `renderers.endpoints` through database/schema_rules.ts, which is what
 * keeps the column off `any`. Nothing writes it yet: the control plane that
 * receives `renderer.hello` lands with #21.
 */
export const rendererEndpointsValidator = vine.create(rendererEndpoints())

export type RendererEndpoints = Infer<ReturnType<typeof rendererEndpoints>>

/**
 * `version`, `capabilities`, `endpoints`, `status` and `lastSeenAt` are
 * declared by the renderer on the control plane or derived from its
 * connection. None of them is accepted from an HTTP request. See
 * docs/DATA-MODEL.md.
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
