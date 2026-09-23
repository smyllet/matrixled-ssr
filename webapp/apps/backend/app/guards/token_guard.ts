import { TokenService, type TokenScope } from '#services/token_service'
import { errors, symbols } from '@adonisjs/auth'
import type { AuthClientResponse, GuardContract } from '@adonisjs/auth/types'
import type { HttpContext } from '@adonisjs/core/http'
import hash from '@adonisjs/core/services/hash'
import { randomBytes } from 'node:crypto'

/**
 * What a guard needs from the row a credential belongs to. Devices and
 * renderers both carry it, and nothing else about them matters here.
 */
export interface Credentialed {
  tokenHash: string
}

export interface TokenGuardOptions<Subject extends Credentialed> {
  scope: TokenScope
  /**
   * Resolves the public prefix to its row — docs/adr/0012-format-des-tokens.md.
   */
  findByPrefix: (prefix: string) => Promise<Subject | null>
}

/**
 * Verified in place of a missing row, so that an unknown prefix costs the same
 * scrypt as a known one and response time does not tell them apart.
 */
let decoyHash: Promise<string> | undefined

function getDecoyHash() {
  decoyHash ??= hash.make(randomBytes(32).toString('hex'))
  return decoyHash
}

/**
 * Authenticates a device or a renderer by the bearer token it was issued. The
 * session guard stays the dashboard's; this one never reads a cookie.
 *
 * Every refusal is the same 401, whatever caused it: a client must not learn
 * whether the prefix it presented belongs to anything.
 */
export class TokenGuard<Subject extends Credentialed> implements GuardContract<Subject> {
  declare [symbols.GUARD_KNOWN_EVENTS]: {}

  /**
   * Borrowed from Adonis's own bearer-token guard for its error renderer. When
   * the auth middleware refuses a request, it raises a fresh
   * `E_UNAUTHORIZED_ACCESS` named after this driver, and only a known name
   * answers in the `{ errors: [{ message }] }` shape the rest of the API uses;
   * any other falls back to a plain-text body.
   */
  readonly driverName = 'access_tokens' as const

  authenticationAttempted = false
  isAuthenticated = false
  user?: Subject

  #tokenService = new TokenService()

  constructor(
    protected ctx: HttpContext,
    protected options: TokenGuardOptions<Subject>
  ) {}

  #authenticationFailed() {
    return new errors.E_UNAUTHORIZED_ACCESS('Unauthorized access', {
      guardDriverName: this.driverName,
    })
  }

  #getBearerToken() {
    const [type, token] = this.ctx.request.header('authorization', '')!.split(' ')

    if (!type || type.toLowerCase() !== 'bearer' || !token) return null

    return token
  }

  getUserOrFail() {
    if (!this.user) throw this.#authenticationFailed()

    return this.user
  }

  async authenticate() {
    if (this.authenticationAttempted) return this.getUserOrFail()

    this.authenticationAttempted = true

    const token = this.#getBearerToken()
    const parsed = token ? this.#tokenService.parse(token) : null

    /**
     * The tag carries the scope, so a credential meant for the other channel is
     * refused before any lookup or hashing (ADR-0012).
     */
    if (!token || !parsed || parsed.scope !== this.options.scope) {
      throw this.#authenticationFailed()
    }

    const subject = await this.options.findByPrefix(parsed.prefix)
    const tokenHash = subject?.tokenHash ?? (await getDecoyHash())
    const verified = await this.#tokenService.verify(tokenHash, token, this.options.scope)

    if (!subject || !verified) throw this.#authenticationFailed()

    this.isAuthenticated = true
    this.user = subject

    return subject
  }

  async check() {
    try {
      await this.authenticate()
      return true
    } catch (error) {
      if (error instanceof errors.E_UNAUTHORIZED_ACCESS) return false
      throw error
    }
  }

  /**
   * Only the hash is stored, so the subject alone cannot be turned back into a
   * credential: tests pass the clear token they were issued.
   */
  async authenticateAsClient(_subject: Subject, token: string): Promise<AuthClientResponse> {
    return { headers: { authorization: `Bearer ${token}` } }
  }
}

export function tokenGuard<Subject extends Credentialed>(options: TokenGuardOptions<Subject>) {
  return {
    async resolver() {
      return (ctx: HttpContext) => new TokenGuard(ctx, options)
    },
  }
}
