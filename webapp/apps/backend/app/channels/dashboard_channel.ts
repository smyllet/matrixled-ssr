import type { HttpContext } from '@adonisjs/core/http'

/**
 * Read from the session guard alone: only a dashboard user subscribes, and a
 * device or renderer id must never be mistaken for one.
 */
export function authorizeUserChannel(ctx: HttpContext, { id }: { id: string }): boolean {
  return ctx.auth.use('web').user?.id === id
}

/**
 * What the platform owns, every user sees: `RendererService.getVisibleRenderers`
 * hands the ownerless renderer to all of them. The channel is therefore open to
 * any authenticated session — and closed to anonymous ones. The route guard
 * already rejects those, but an unsecured channel is allowed to everybody by
 * default, so the rule is stated rather than assumed.
 */
export function authorizePlatformChannel(ctx: HttpContext): boolean {
  return ctx.auth.use('web').user !== undefined
}
