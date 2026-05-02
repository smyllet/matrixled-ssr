import { createTuyau } from '@tuyau/core/client'
import { registry } from '@matrixled-ssr/backend/registry'
import { superjson } from '@tuyau/superjson/plugin'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()

  const api = createTuyau({
    baseUrl: config.public.apiUrl || 'http://localhost:3333',
    registry,
    plugins: [superjson()],
  })

  return {
    provide: {
      api,
    },
  }
})
