import { usePage } from '@inertiajs/vue3'
import { computed } from 'vue'

const page = usePage()

export function usePageSuccess() {
  return computed<string | undefined>(() => page.props.success as string | undefined)
}
