import type Device from '#models/device'
import type Renderer from '#models/renderer'
import type { TokenGuardOptions } from '#guards/token_guard'

/**
 * How each non-browser client's credential resolves to its row. Declared once
 * because two readers need it: the auth guards of `config/auth.ts`, and the
 * control-plane handshake, which authenticates outside any HTTP route.
 *
 * The models are imported lazily: `config/auth.ts` loads before the ORM is
 * ready.
 */
export const deviceCredentials: TokenGuardOptions<Device> = {
  scope: 'device',
  findByPrefix: async (prefix) => {
    const { default: DeviceModel } = await import('#models/device')
    return DeviceModel.findBy('token_prefix', prefix)
  },
}

export const rendererCredentials: TokenGuardOptions<Renderer> = {
  scope: 'renderer',
  findByPrefix: async (prefix) => {
    const { default: RendererModel } = await import('#models/renderer')
    return RendererModel.findBy('token_prefix', prefix)
  },
}
