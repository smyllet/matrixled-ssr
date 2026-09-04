/**
 * A device addresses its pixels with a 16-bit index, which caps a panel at
 * 65 536 pixels — 256×256 (docs/PROTOCOL-DEVICE.md). Neither a scene authored
 * above that nor a device declaring it could ever display anything, so the
 * bound is enforced on the way in: by this constant in the validators and the
 * services, and by a CHECK constraint in the `scenes` and `devices`
 * migrations, which carry the literal because a migration must stay a frozen
 * snapshot of the schema at its date.
 *
 * The frontend imports it too, through the package's `./constants/protocol`
 * export, so the client-side forms and the API agree on one number.
 */
export const PROTOCOL_MAXIMUM_PIXELS = 65536
