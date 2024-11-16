import { usePage } from '@inertiajs/vue3'
import { computed } from 'vue'

type Errors = Record<string, string>
type ErrorBag = Record<string, Errors>

export function usePageErrorsBag() {
  return computed<ErrorBag | undefined>(() => usePage().props.errorsBag as ErrorBag | undefined)
}
