import { usePage } from '@inertiajs/vue3'
import { computed } from 'vue'

export function usePageSuccess() {
  return computed<string | undefined>(() => usePage().props.success as string | undefined)
}
