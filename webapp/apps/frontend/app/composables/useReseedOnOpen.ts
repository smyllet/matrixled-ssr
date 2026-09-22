import type { FormContext, FormState, GenericObject } from 'vee-validate'
import type { Ref } from 'vue'

/**
 * A sheet unmounts its content when it closes, and vee-validate drops the
 * value of every field it sees unmount — so a form reopened comes back empty
 * instead of showing what it should. Every sheet holding a form needs this.
 *
 * Reseeding on open is the fix rather than keeping the values across the
 * close, because it is also the behaviour these forms should have on their
 * own: a creation form reopened starts from its defaults, an edit form from
 * the stored record, and neither from a draft the user abandoned by closing
 * the sheet.
 *
 * The seed is read at open and not watched afterwards: a sheet left open while
 * the list refreshes underneath it — the SSE channel does that on every
 * mutation — keeps what is being typed in it.
 */
export function useReseedOnOpen<T extends GenericObject>(
  open: Ref<boolean>,
  form: FormContext<T>,
  seed?: () => FormState<T>['values']
) {
  watch(open, (opened) => {
    if (!opened) return

    form.resetForm(seed ? { values: seed() } : undefined)
  })
}
