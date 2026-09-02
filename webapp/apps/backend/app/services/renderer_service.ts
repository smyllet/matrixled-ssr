import RendererCreated from '#events/renderer_created'
import RendererDeleted from '#events/renderer_deleted'
import RendererUpdated from '#events/renderer_updated'
import Renderer from '#models/renderer'
import { TokenService } from '#services/token_service'
import { inject } from '@adonisjs/core'

@inject()
export class RendererService {
  constructor(protected tokenService: TokenService) {}

  /**
   * A user sees the renderers they own plus the platform one, which serves
   * everybody by default.
   */
  async getVisibleRenderers(userId: string) {
    return Renderer.query()
      .where((query) => query.where('owner_id', userId).orWhereNull('owner_id'))
      .orderBy('created_at')
  }

  async getRendererById(rendererId: string) {
    return Renderer.findOrFail(rendererId)
  }

  async getDefaultRenderer() {
    return Renderer.query().where('is_default', true).firstOrFail()
  }

  /**
   * Returns the clear token alongside the renderer: this is the only moment it
   * exists, and no endpoint can hand it out again afterwards.
   */
  async createRenderer({ name, ownerId }: { name: string; ownerId: string }) {
    const credential = await this.tokenService.issue('renderer')

    const renderer = await Renderer.create({
      name,
      ownerId,
      tokenPrefix: credential.prefix,
      tokenHash: credential.hash,
    })

    /**
     * `status` and `isDefault` are database defaults, so the fresh instance
     * does not carry them. Reload so the response describes the stored row.
     */
    await renderer.refresh()

    RendererCreated.dispatch(renderer)

    return { renderer, token: credential.token }
  }

  /**
   * Applies the credential declared by the deployment to the platform renderer.
   *
   * Idempotent, and cheap: the prefix alone says whether the stored credential
   * already is this token, so a normal boot hashes nothing. Changing the
   * variable rotates the credential on the next start.
   */
  async provisionPlatformRenderer(token: string) {
    const parsed = this.tokenService.parse(token)

    if (!parsed || parsed.scope !== 'renderer') {
      throw new Error(
        'PLATFORM_RENDERER_TOKEN is not a renderer token. Expected the "mxr_<prefix>_<secret>" format.'
      )
    }

    const renderer = await Renderer.query().where('is_default', true).first()

    if (!renderer || renderer.tokenPrefix === parsed.prefix) {
      return renderer
    }

    renderer.tokenPrefix = parsed.prefix
    renderer.tokenHash = await this.tokenService.hashSecret(parsed.secret)

    await renderer.save()

    return renderer
  }

  async patchRenderer(renderer: Renderer, { name }: Partial<{ name: string }>) {
    renderer.name = name ?? renderer.name

    /**
     * Read before `save()`, which resets the tracking. A client resubmitting an
     * unchanged form — the edit sheet does — must not wake every open tab for a
     * refetch that would return the row it already holds.
     */
    const modified = renderer.$isDirty

    await renderer.save()

    if (modified) {
      RendererUpdated.dispatch(renderer)
    }

    return renderer
  }

  async deleteRenderer(renderer: Renderer) {
    await renderer.delete()

    RendererDeleted.dispatch(renderer)
  }

  /**
   * Replaces the credential. The previous token stops working immediately,
   * which is what makes this the answer to a leak.
   */
  async rotateToken(renderer: Renderer) {
    const credential = await this.tokenService.issue('renderer')

    renderer.tokenPrefix = credential.prefix
    renderer.tokenHash = credential.hash

    await renderer.save()

    RendererUpdated.dispatch(renderer)

    return { renderer, token: credential.token }
  }
}
