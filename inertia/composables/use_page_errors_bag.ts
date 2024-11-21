import { usePage } from '@inertiajs/vue3'
import { computed } from 'vue'

type ErrorBag = Record<string, string>

const page = usePage()

export function usePageErrorsBag() {
  return computed<ErrorBag | undefined>(() => page.props.errorsBag as ErrorBag | undefined)
}
