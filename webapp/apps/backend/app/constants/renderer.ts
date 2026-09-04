/**
 * A renderer declares the addresses its devices can reach it on: `wss://`,
 * `ws://`, or both (docs/adr/0016-transports-declares-par-le-renderer.md).
 * The list is untrusted input — Adonis cannot probe a NATed renderer to check
 * what it claims — so it is bounded before being persisted.
 *
 * Four entries because the `wss://` of ADR-0016 routinely comes alongside more
 * than one LAN address: IPv4 and IPv6, two network interfaces, a name and an
 * address, or a local address next to a public tunnel. The bound protects the
 * size of the row; it does not model a use case, and Adonis has no way of
 * knowing which address it would have been right to keep.
 *
 * Enforced twice: by the validator in app/validators/renderer.ts, which alone
 * can reach inside the list, and by a CHECK constraint in the
 * `1788510310378_alter_renderers_endpoints_table` migration, which carries the
 * literal because a migration must stay a frozen snapshot of the schema at its
 * date.
 */
export const RENDERER_MAXIMUM_ENDPOINTS = 4

export const RENDERER_ENDPOINT_MAXIMUM_LENGTH = 255
