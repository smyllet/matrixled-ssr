import { usePage } from '@inertiajs/vue3'
import { computed } from 'vue'

type Notification = {
  type: 'success' | 'error' | 'info' | 'warn'
  message: string
}

const page = usePage()

export function usePageNotification() {
  return computed<Notification | undefined>(
    () => page.props.notification as Notification | undefined
  )
}
