<script setup lang="ts">
import type { Route } from '@tuyau/core/types'
import { toTypedSchema } from '@vee-validate/zod'
import { AlertCircleIcon, CheckCircle2Icon } from 'lucide-vue-next'
import { useForm } from 'vee-validate'
import type { Reactive } from 'vue'
import z from 'zod'

const { t } = useI18n()
const { $api } = useNuxtApp()

let createdAccount = ref<Route.Response<'auth.new_account.store'>['data']['user'] | null>(null)
let registerError = ref<string | null>(null)

const formSchema = computed(() =>
  toTypedSchema(
    z
      .object({
        fullName: z.string().min(3).max(100),
        email: z.string().email().max(254),
        password: z.string().min(8),
        passwordConfirmation: z.string(),
      })
      .refine((data) => data.password === data.passwordConfirmation, {
        message: t('pages.register.validation.pwd_mismatch'),
        path: ['passwordConfirmation'],
      })
  )
)

const form = useForm({
  validationSchema: formSchema,
})

const onSubmit = form.handleSubmit(async (values) => {
  registerError.value = null

  const [data, error] = await $api
    .request('auth.new_account.store', {
      body: values,
    })
    .safe()

  if (error) {
    if (
      error.isStatus(422) &&
      error.response.errors.find((e) => e.field === 'email' && e.rule === 'database.unique')
    ) {
      form.setFieldError('email', t('pages.register.validation.email_taken'))
    } else {
      registerError.value = t('pages.register.failure.unknownDescription')
    }
    return
  }

  createdAccount.value = data.data.user
  form.resetForm()
})
</script>

<template>
  <div class="relative flex h-screen w-full items-center justify-center">
    <div class="absolute top-6 right-6">
      <LocaleButton />
    </div>

    <div class="mx-auto w-full max-w-md space-y-6 p-6">
      <div class="text-center">
        <h1 class="text-2xl font-bold">{{ t('pages.register.title') }}</h1>
      </div>

      <UiAlert v-if="createdAccount">
        <CheckCircle2Icon />
        <UiAlertTitle>{{ t('pages.register.success') }}</UiAlertTitle>
        <UiAlertDescription>
          {{ t('pages.register.successDescription', { email: createdAccount.email }) }}
        </UiAlertDescription>
      </UiAlert>

      <UiAlert v-if="registerError" variant="destructive">
        <AlertCircleIcon />
        <UiAlertTitle>{{ t('pages.register.failure.title') }}</UiAlertTitle>
        <UiAlertDescription>
          {{ registerError }}
        </UiAlertDescription>
      </UiAlert>

      <form class="space-y-4" @submit="onSubmit">
        <UiFormField v-slot="{ componentField }" name="fullName">
          <UiFormItem>
            <UiFormLabel>{{ t('pages.register.fields.fullName') }}</UiFormLabel>
            <UiFormControl>
              <UiInput
                :placeholder="t('pages.register.fields.fullNamePlaceholder')"
                v-bind="componentField"
              />
            </UiFormControl>
            <UiFormMessage />
          </UiFormItem>
        </UiFormField>

        <UiFormField v-slot="{ componentField }" name="email">
          <UiFormItem>
            <UiFormLabel>{{ t('pages.register.fields.email') }}</UiFormLabel>
            <UiFormControl>
              <UiInput
                type="email"
                :placeholder="t('pages.register.fields.emailPlaceholder')"
                v-bind="componentField"
              />
            </UiFormControl>
            <UiFormMessage />
          </UiFormItem>
        </UiFormField>

        <UiFormField v-slot="{ componentField }" name="password">
          <UiFormItem>
            <UiFormLabel>{{ t('pages.register.fields.password') }}</UiFormLabel>
            <UiFormControl>
              <UiInput type="password" v-bind="componentField" />
            </UiFormControl>
            <UiFormMessage />
          </UiFormItem>
        </UiFormField>

        <UiFormField v-slot="{ componentField }" name="passwordConfirmation">
          <UiFormItem>
            <UiFormLabel>{{ t('pages.register.fields.confirmPassword') }}</UiFormLabel>
            <UiFormControl>
              <UiInput type="password" v-bind="componentField" />
            </UiFormControl>
            <UiFormMessage />
          </UiFormItem>
        </UiFormField>

        <UiButton
          type="submit"
          class="w-full"
          :disabled="!form.meta.value.valid || form.meta.value.pending || !!createdAccount"
        >
          <template v-if="form.meta.value.pending">
            <UiSpinner class="animate-spin" />
          </template>
          <template v-else>
            {{ t('pages.register.submit') }}
          </template>
        </UiButton>
      </form>
      <div class="text-center mt-4">
        <NuxtLink to="/login" v-slot="{ navigate, href }">
          <UiButton variant="link" @click="navigate" :href>
            {{ t('pages.register.alreadyHaveAccount') }}
          </UiButton>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
