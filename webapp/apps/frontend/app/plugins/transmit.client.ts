import { Transmit } from '@adonisjs/transmit-client'

/**
 * Client-only on purpose: `EventSource` does not exist on the Nitro side, and
 * the `.client` suffix is what keeps this plugin out of the server bundle.
 *
 * `baseUrl` is the origin of the page, never `runtimeConfig.public.apiUrl`:
 * that one defaults to `/`, which would build the protocol-relative URL
 * `//__transmit/events` and point the stream at a host named `__transmit`.
 * Same-origin also means the session cookie (`httpOnly`, `sameSite: lax`)
 * travels with the stream — in dev through the `/__transmit` proxy declared in
 * `nuxt.config.ts`, since the transmit routes sit at the backend root, outside
 * the `/api` prefix.
 */
export default defineNuxtPlugin(() => {
  const connectionLost = useDashboardConnectionLost()

  const transmit = new Transmit({
    baseUrl: window.location.origin,
    /**
     * The subscription HTTP calls answer 401 once the session has expired.
     * This mirrors the `beforeError` hook of `app/plugins/api.ts`, which does
     * the same for the REST client.
     */
    onSubscribeFailed: (response) => {
      if (response.status === 401) {
        void navigateTo('/login')
      }
    },
    /**
     * Fired once `maxReconnectAttempts` is exhausted, after which the client
     * never retries. SSE being the only refresh path, the dashboard would go
     * on showing stale rows without a word — so it says so instead.
     */
    onReconnectFailed: () => {
      connectionLost.value = true
    },
  })

  return {
    provide: {
      transmit,
    },
  }
})
