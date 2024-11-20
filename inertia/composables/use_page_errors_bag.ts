import { usePage } from '@inertiajs/vue3'
import { computed } from 'vue'

type ErrorBag = Record<string, string>

export function usePageErrorsBag() {
  return computed<ErrorBag | undefined>(() => usePage().props.errorsBag as ErrorBag | undefined)
}
