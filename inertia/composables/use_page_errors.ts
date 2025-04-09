import { usePage } from '@inertiajs/vue3'
import { computed } from 'vue'

export function usePageErrors() {
  const page = usePage()
  return computed(() => page.props.errors)
}
