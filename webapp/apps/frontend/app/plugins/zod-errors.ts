import z from 'zod'

export default defineNuxtPlugin(() => {
  const { $i18n } = useNuxtApp()

  z.setErrorMap((issue, ctx) => {
    if (issue.code === z.ZodIssueCode.invalid_type) {
      if (issue.received === 'undefined') {
        return { message: $i18n.t('validation.required') }
      }

      /**
       * What an emptied number field produces: `z.coerce.number()` turns `''`
       * into `NaN`, which is a number by type and so never reports as missing.
       */
      if (issue.received === 'nan') {
        return { message: $i18n.t('validation.number') }
      }
    }

    /**
     * The bounds read differently on a length and on a value: "at least 1
     * characters" under a width field is simply wrong.
     */
    if (issue.code === z.ZodIssueCode.too_small) {
      const key = issue.type === 'number' ? 'validation.minNumber' : 'validation.min'

      return { message: $i18n.t(key, { min: issue.minimum }) }
    }

    if (issue.code === z.ZodIssueCode.too_big) {
      const key = issue.type === 'number' ? 'validation.maxNumber' : 'validation.max'

      return { message: $i18n.t(key, { max: issue.maximum }) }
    }

    if (issue.code === z.ZodIssueCode.invalid_string) {
      if (issue.validation === 'email') {
        return { message: $i18n.t('validation.email') }
      }
    }

    return { message: ctx.defaultError }
  })
})
