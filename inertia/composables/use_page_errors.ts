import { usePage } from '@inertiajs/vue3'
import { computed } from 'vue'

const page = usePage()

export function usePageErrors() {
  return computed(() => page.props.errors)
}
