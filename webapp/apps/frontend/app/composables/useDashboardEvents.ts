import type { Subscription } from '@adonisjs/transmit-client'

/**
 * The only envelope version this client understands. As on the control plane,
 * a message carrying an unknown major version is ignored and logged, never
 * interpreted on a best-effort basis.
 */
const ENVELOPE_VERSION = 1

/**
 * Maps the entity prefix of an event type onto the `useAsyncData` key of the
 * page that lists it. The three keys are static, so the pages themselves have
 * nothing to declare. A prefix missing from this table — `device.status` is
 * reserved but not implemented — is simply ignored.
 */
const DATA_KEY_BY_ENTITY: Record<string, string> = {
  matrix: 'matrices',
  scene: 'scenes',
  renderer: 'renderers',
}

interface DashboardEvent {
  v: number
  type: string
  payload: { id: string }
}

function isDashboardEvent(message: unknown): message is DashboardEvent {
  if (typeof message !== 'object' || message === null) {
    return false
  }

  const { v, type } = message as Partial<DashboardEvent>

  if (v !== ENVELOPE_VERSION) {
    console.warn('[dashboard] ignoring an envelope of unknown version', v)

    return false
  }

  return typeof type === 'string'
}

/**
 * Subscribes the dashboard to the server-sent notification channels, and turns
 * every event into a refetch of the matching list. The payload is only an id:
 * the truth is re-read from the REST API rather than rebuilt from the message.
 *
 * Two channels feed the same handler:
 *
 * - `users/<id>` — what belongs to the signed-in user;
 * - `platform` — what belongs to the platform and every user sees, today the
 *   ownerless renderer that `getVisibleRenderers` hands to everyone.
 *
 * Meant to be called once, from the authenticated layout: its unmount disposes
 * the scope, which deletes the subscriptions.
 */
export function useDashboardEvents() {
  const { $transmit } = useNuxtApp()
  const { data: user } = useCurrentUser()

  const subscriptions = new Map<string, Subscription>()

  async function refreshFor(message: unknown) {
    if (!isDashboardEvent(message)) {
      return
    }

    const entity = message.type.split('.')[0] ?? ''
    const key = DATA_KEY_BY_ENTITY[entity]

    if (!key) {
      return
    }

    await refreshNuxtData(key)
  }

  async function subscribe(channel: string) {
    if (subscriptions.has(channel)) {
      return
    }

    const subscription = $transmit.subscription(channel)
    subscriptions.set(channel, subscription)

    subscription.onMessage<unknown>(refreshFor)

    await subscription.create()
  }

  onScopeDispose(() => {
    for (const subscription of subscriptions.values()) {
      void subscription.delete()
    }

    subscriptions.clear()
  })

  void subscribe('platform')

  watch(
    () => user.value?.id,
    (id) => {
      if (id) {
        void subscribe(`users/${id}`)
      }
    },
    { immediate: true }
  )
}
