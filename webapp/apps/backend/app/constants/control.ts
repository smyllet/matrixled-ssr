/**
 * The control-plane endpoint a renderer dials (docs/PROTOCOL-CONTROL.md). It
 * is not an Adonis route: the WebSocket upgrade is handled on the Node server
 * before the router ever sees the request.
 */
export const CONTROL_PATH = '/api/v1/renderer/control'

/**
 * Close codes the platform ends a control connection with. The 4000 range is
 * the one RFC 6455 leaves to applications; the renderer tells them apart to
 * decide whether reconnecting makes sense.
 */
export const CONTROL_CLOSE = {
  /**
   * The server is shutting down. Reconnect, with the usual backoff.
   */
  goingAway: 1001,
  /**
   * The same renderer opened a newer connection, which wins. The old one is
   * usually a dead TCP stream its own side has not noticed yet.
   */
  superseded: 4001,
  /**
   * The credential this connection authenticated with no longer exists: it was
   * rotated, or the renderer was deleted. Reconnecting with it will be refused.
   */
  revoked: 4003,
  /**
   * The platform could not check the credential, through no fault of the
   * renderer: a database hiccup. Reconnect, with the usual backoff — the token
   * may well be valid, and `revoked` would tell the renderer to give it up.
   */
  internalError: 1011,
} as const

/**
 * The control channel is event-driven JSON (docs/PROTOCOL-CONTROL.md). A full
 * sync is the largest message a renderer receives, never one it sends, so an
 * inbound frame past this bound is untrusted input to refuse, not a use case.
 */
export const CONTROL_MAXIMUM_PAYLOAD = 64 * 1024

/**
 * A silent drop — a pulled cable, a NAT forgetting the mapping — closes
 * nothing, so it is detected by a ping left without a pong. A renderer gone
 * that way reads `offline` within two intervals.
 */
export const CONTROL_HEARTBEAT_INTERVAL_MS = 30_000

/**
 * At shutdown, how long a renderer is given to answer the closing handshake
 * before its socket is cut. The process is stopping either way; this only
 * bounds how long a silent peer can delay it.
 */
export const CONTROL_SHUTDOWN_GRACE_MS = 2000
