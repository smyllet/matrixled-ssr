export const policies = {
  DevicePolicy: () => import('#policies/device_policy'),
  RendererPolicy: () => import('#policies/renderer_policy'),
  ScenePolicy: () => import('#policies/scene_policy'),
}

