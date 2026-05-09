import { createTuyau } from '@tuyau/core/client'
import { registry } from '@matrixled-ssr/backend/registry'
import { superjson } from '@tuyau/superjson/plugin'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()

  const api = createTuyau({
    baseUrl: config.public.apiUrl || 'http://localhost:3333',
    registry,
    plugins: [superjson()],
    hooks: {
      beforeError: [
        async (error) => {
          if (error.response.status === 401) {
            await navigateTo('/login')
          }

          return error
        },
      ],
    },
  })

  return {
    provide: {
      api,
    },
  }
})
