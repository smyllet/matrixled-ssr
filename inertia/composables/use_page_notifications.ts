import { usePage } from '@inertiajs/vue3'
import { computed } from 'vue'

type Notification = {
  type: 'success' | 'error' | 'info' | 'warn'
  message: string
}

export function usePageNotification() {
  const page = usePage()
  return computed<Notification | undefined>(
    () => page.props.notification as Notification | undefined
  )
}
