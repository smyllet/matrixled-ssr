/**
 * Whether the notification channel has given up for good.
 *
 * `transmit-client` retries a dropped stream `maxReconnectAttempts` times — 5
 * by default — then stops and never tries again. That was harmless while the
 * Nuxt hooks refreshed the interface locally; now that SSE is the only refresh
 * path, the dashboard stops reflecting anything past that point, the user's own
 * actions included. Silent staleness is worse than a visible failure, hence
 * this flag and the banner that reads it.
 *
 * One-way on purpose: the client cannot recover by itself, so nothing clears
 * this except the reload it asks for.
 */
export function useDashboardConnectionLost() {
  return useState('dashboard-connection-lost', () => false)
}
