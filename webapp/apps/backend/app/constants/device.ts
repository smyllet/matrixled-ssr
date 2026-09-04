/**
 * Half scale. A HUB75 panel at full brightness is uncomfortable indoors and
 * draws its worst-case current, so a device that says nothing gets a value it
 * can be turned up from rather than one it has to be turned down from.
 */
export const DEVICE_DEFAULT_BRIGHTNESS = 128

export const DEVICE_MINIMUM_BRIGHTNESS = 0
export const DEVICE_MAXIMUM_BRIGHTNESS = 255

/**
 * Seven days: the default lease a renderer may keep serving a device without
 * hearing from the platform (docs/adr/0015-bail-de-session-device.md). `null`
 * means unlimited — a legitimate choice for a panel carrying nothing
 * sensitive, never a default.
 */
export const DEVICE_DEFAULT_OFFLINE_GRACE = 604800

/**
 * One panel unless the wiring says otherwise. `chainLength` is wiring
 * information for the firmware; it describes nothing about the image, whose
 * only geometry is `width` × `height`.
 */
export const DEVICE_DEFAULT_CHAIN_LENGTH = 1

/**
 * The emission cap, when there is one. The cadence itself belongs to the scene
 * (docs/adr/0019-cadence-portee-par-la-scene.md): a device only bounds how
 * often it is written to, and shares the scene's bounds because the two are
 * compared to each other.
 */
export const DEVICE_MINIMUM_MAX_FPS = 1
export const DEVICE_MAXIMUM_MAX_FPS = 60
