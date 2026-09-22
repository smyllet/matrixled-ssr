import Renderer from '#models/renderer'
import User from '#models/user'
import { TokenService } from '#services/token_service'

let sequence = 0

/**
 * The suite truncates between tests, so the counter is only there to keep two
 * users created by the same test apart.
 */
export async function createUser() {
  sequence += 1

  return User.create({
    fullName: 'Ada Lovelace',
    email: `ada-${sequence}@example.test`,
    password: 'secret123',
  })
}

/**
 * Every device needs a renderer, and an omitted `rendererId` resolves to the
 * default one. The suite truncates *after* each test, so the first test of a
 * run still sees the platform renderer its migration inserted while every
 * later one does not: resolve or create, rather than depend on where in the
 * run a file lands.
 */
export async function platformRenderer() {
  const existing = await Renderer.query().where('is_default', true).first()

  if (existing) return existing

  const credential = await new TokenService().issue('renderer')

  return Renderer.create({
    name: 'Platform renderer',
    ownerId: null,
    isDefault: true,
    tokenPrefix: credential.prefix,
    tokenHash: credential.hash,
  })
}
