import { usePage } from '@inertiajs/vue3'
import { computed } from 'vue'

type Notification = {
  type: 'success' | 'error' | 'info' | 'warn'
  message: string
}

export function usePageNotification() {
  return computed<Notification | undefined>(
    () => usePage().props.notification as Notification | undefined
  )
}
