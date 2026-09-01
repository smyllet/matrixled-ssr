/**
 * A device addresses its pixels with a 16-bit index, which caps a panel at
 * 65 536 pixels — 256×256 (docs/PROTOCOL-DEVICE.md). A scene authored above
 * that could never be displayed, so the bound is enforced on the way in: by
 * this constant in the validator and the service, and by a CHECK constraint
 * in the `scenes` migration, which carries the literal because a migration
 * must stay a frozen snapshot of the schema at its date.
 *
 * The frontend imports it too, through the package's `./constants/scene`
 * export, so the client-side form and the API agree on one number.
 */
export const PROTOCOL_MAXIMUM_PIXELS = 65536
