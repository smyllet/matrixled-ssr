import { usePage } from '@inertiajs/vue3'
import { computed } from 'vue'

type ErrorBag = Record<string, string>

export function usePageErrorsBag() {
  const page = usePage()
  return computed<ErrorBag | undefined>(() => page.props.errorsBag as ErrorBag | undefined)
}
