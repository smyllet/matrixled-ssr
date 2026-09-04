/**
 * Geometry rules the dashboard has to apply as well as the API. Shared as
 * source through the package's `./shared/geometry` export, for the same reason
 * `PROTOCOL_MAXIMUM_PIXELS` is: a rule restated in the client is a rule that
 * drifts from the one the server enforces.
 */

export interface Geometry {
  width: number
  height: number
}

/**
 * A scene is displayable on a device when the device geometry is a multiple of
 * the scene's by the **same integer factor on both axes**: the renderer then
 * replicates each pixel into a k×k block, which loses nothing
 * (docs/adr/0018-geometrie-native-de-la-scene.md). Any other pair would need a
 * pixel destroyed or a row stretched.
 */
export function isDisplayable(device: Geometry, scene: Geometry) {
  if (device.width % scene.width !== 0 || device.height % scene.height !== 0) return false

  return device.width / scene.width === device.height / scene.height
}
