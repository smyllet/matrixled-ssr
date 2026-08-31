import hash from '@adonisjs/core/services/hash'
import { randomBytes } from 'node:crypto'

/**
 * Credentials issued to non-browser clients. Renderers and devices follow the
 * same rule, so they share this service — see docs/adr/0012-format-des-tokens.md.
 */
export type TokenScope = 'renderer' | 'device'

const SCOPE_TAGS: Record<TokenScope, string> = {
  renderer: 'mxr',
  device: 'mxd',
}

/**
 * Hex rather than base64url: the separator must not appear inside the parts,
 * and the token is read by an ESP32 firmware and a Go renderer as much as by
 * this codebase.
 */
const PREFIX_BYTES = 6
const SECRET_BYTES = 32

export interface IssuedToken {
  /**
   * The only moment the credential exists in clear. It is never stored.
   */
  token: string
  prefix: string
  hash: string
}

export interface ParsedToken {
  scope: TokenScope
  prefix: string
  secret: string
}

export class TokenService {
  async issue(scope: TokenScope): Promise<IssuedToken> {
    const prefix = randomBytes(PREFIX_BYTES).toString('hex')
    const secret = randomBytes(SECRET_BYTES).toString('hex')

    return {
      token: `${SCOPE_TAGS[scope]}_${prefix}_${secret}`,
      prefix,
      hash: await hash.make(secret),
    }
  }

  /**
   * Hashes a secret that was not generated here — a credential provisioned by
   * the deployment rather than issued at pairing.
   */
  async hashSecret(secret: string) {
    return hash.make(secret)
  }

  /**
   * A client presents its token with no identifier attached, so the prefix is
   * what resolves it to a row. Callers look the row up by prefix, then verify.
   */
  parse(token: string): ParsedToken | null {
    const [tag, prefix, secret, ...rest] = token.split('_')

    if (!tag || !prefix || !secret || rest.length > 0) return null

    const scope = (Object.keys(SCOPE_TAGS) as TokenScope[]).find((key) => SCOPE_TAGS[key] === tag)

    if (!scope) return null

    return { scope, prefix, secret }
  }

  async verify(tokenHash: string, token: string, scope: TokenScope): Promise<boolean> {
    const parsed = this.parse(token)

    if (!parsed || parsed.scope !== scope) return false

    return hash.verify(tokenHash, parsed.secret)
  }
}
