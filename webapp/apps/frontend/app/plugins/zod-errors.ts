import { provideSSRWidth } from '@vueuse/core'
import z from 'zod'

export default defineNuxtPlugin(() => {
  const { $i18n } = useNuxtApp()

  z.setErrorMap((issue, ctx) => {
    if (issue.code === z.ZodIssueCode.invalid_type) {
      if (issue.received === 'undefined') {
        return { message: $i18n.t('validation.required') }
      }
    }

    if (issue.code === z.ZodIssueCode.too_small) {
      return { message: $i18n.t('validation.min', { min: issue.minimum }) }
    }

    if (issue.code === z.ZodIssueCode.too_big) {
      return { message: $i18n.t('validation.max', { max: issue.maximum }) }
    }

    if (issue.code === z.ZodIssueCode.invalid_string) {
      if (issue.validation === 'email') {
        return { message: $i18n.t('validation.email') }
      }
    }

    return { message: ctx.defaultError }
  })
})
