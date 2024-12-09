import { usePage } from '@inertiajs/vue3'
import { computed } from 'vue'

export function usePageSuccess() {
  const page = usePage()
  return computed<string | undefined>(() => page.props.success as string | undefined)
}
