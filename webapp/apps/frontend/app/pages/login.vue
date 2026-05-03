<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { AlertCircleIcon } from 'lucide-vue-next'
import { useForm } from 'vee-validate'
import z from 'zod'

const { t } = useI18n()
const { $api } = useNuxtApp()

const loginError = ref<string | null>(null)

const formSchema = computed(() =>
  toTypedSchema(
    z.object({
      email: z.string().email(),
      password: z.string(),
    })
  )
)

const form = useForm({
  validationSchema: formSchema,
})

const onSubmit = form.handleSubmit(async (values) => {
  loginError.value = null

  const [data, error] = await $api
    .request('auth.session.store', {
      body: values,
    })
    .safe()

  if (error) {
    if (error.isStatus(400)) {
      loginError.value = t('pages.login.failure.invalidCredentialsDescription')
    } else {
      loginError.value = t('pages.login.failure.unknownDescription')
    }
    return
  }

  await navigateTo('/', { replace: true })
})
</script>

<template>
  <div class="relative flex h-screen w-full items-center justify-center">
    <div class="absolute top-6 right-6">
      <LocaleButton />
    </div>

    <div class="mx-auto w-full max-w-md space-y-6 p-6">
      <div class="text-center">
        <h1 class="text-2xl font-bold">{{ t('pages.login.title') }}</h1>
      </div>

      <UiAlert v-if="loginError" variant="destructive">
        <AlertCircleIcon />
        <UiAlertTitle>{{ t('pages.login.failure.title') }}</UiAlertTitle>
        <UiAlertDescription>
          {{ loginError }}
        </UiAlertDescription>
      </UiAlert>

      <form class="space-y-4" @submit="onSubmit">
        <UiFormField v-slot="{ componentField }" name="email">
          <UiFormItem>
            <UiFormLabel>{{ t('pages.login.fields.email') }}</UiFormLabel>
            <UiFormControl>
              <UiInput type="email" placeholder="john@example.com" v-bind="componentField" />
            </UiFormControl>
            <UiFormMessage />
          </UiFormItem>
        </UiFormField>

        <UiFormField v-slot="{ componentField }" name="password">
          <UiFormItem>
            <UiFormLabel>{{ t('pages.login.fields.password') }}</UiFormLabel>
            <UiFormControl>
              <UiInput type="password" v-bind="componentField" />
            </UiFormControl>
            <UiFormMessage />
          </UiFormItem>
        </UiFormField>

        <UiButton type="submit" class="w-full" :disabled="!form.meta.value.valid">
          {{ t('pages.login.submit') }}
        </UiButton>
      </form>

      <div class="text-center mt-4">
        <NuxtLink to="/register" v-slot="{ navigate, href }">
          <UiButton variant="link" @click="navigate" :href>
            {{ t('pages.login.noAccount') }}
          </UiButton>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
