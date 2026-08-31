<script setup lang="ts">
import { AlertCircleIcon } from 'lucide-vue-next'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import z from 'zod'

const { t } = useI18n()
const { $api, callHook } = useNuxtApp()

const open = ref(false)

const creationError = ref<string | null>(null)

/**
 * The clear token only exists in this response. Once the sheet is closed it is
 * gone for good, so the sheet stays open on it until the user dismisses it.
 */
const issuedToken = ref<string | null>(null)

const formSchema = computed(() =>
  toTypedSchema(
    z.object({
      name: z.string().min(3).max(100),
    })
  )
)

const form = useForm({
  validationSchema: formSchema,
  initialValues: {
    name: '',
  },
})

const onSubmit = form.handleSubmit(async (values) => {
  creationError.value = null

  const [data, error] = await $api
    .request('renderers.store', {
      body: values,
    })
    .safe()

  if (error) {
    creationError.value = t('sheets.createRenderer.failure.unknownDescription')

    return
  }

  form.resetForm()

  issuedToken.value = data.data.token

  await callHook('app:renderer:created', data.data)
})

function close() {
  issuedToken.value = null
  creationError.value = null
  open.value = false
}
</script>

<template>
  <UiSheet v-model:open="open" @update:open="!$event && close()">
    <UiSheetTrigger asChild>
      <slot />
    </UiSheetTrigger>
    <UiSheetContent>
      <UiSheetHeader>
        <UiSheetTitle>{{ t('sheets.createRenderer.title') }}</UiSheetTitle>
      </UiSheetHeader>

      <div class="grid flex-1 auto-rows-min gap-6 px-4">
        <UiAlert v-if="creationError" variant="destructive">
          <AlertCircleIcon />
          <UiAlertTitle>{{ t('sheets.createRenderer.failure.title') }}</UiAlertTitle>
          <UiAlertDescription>{{ creationError }}</UiAlertDescription>
        </UiAlert>

        <RendererTokenReveal v-if="issuedToken" :token="issuedToken" />

        <form v-else @submit.prevent="onSubmit" id="create-renderer-form">
          <UiFormField v-slot="{ componentField }" name="name">
            <UiFormItem>
              <UiFormLabel>{{ t('sheets.createRenderer.fields.name') }}</UiFormLabel>
              <UiFormControl>
                <UiInput v-bind="componentField" />
              </UiFormControl>
              <UiFormMessage />
            </UiFormItem>
          </UiFormField>
        </form>
      </div>

      <UiSheetFooter>
        <UiButton v-if="issuedToken" class="w-full cursor-pointer" @click="close()">
          {{ t('sheets.createRenderer.done') }}
        </UiButton>

        <template v-else>
          <UiButton
            type="submit"
            form="create-renderer-form"
            class="w-full"
            :disabled="!form.meta.value.valid || form.meta.value.pending"
          >
            <template v-if="form.meta.value.pending">
              <UiSpinner class="animate-spin" />
            </template>
            <template v-else>
              {{ t('sheets.createRenderer.submit') }}
            </template>
          </UiButton>

          <UiSheetClose as-child>
            <UiButton variant="outline">
              {{ t('sheets.createRenderer.cancel') }}
            </UiButton>
          </UiSheetClose>
        </template>
      </UiSheetFooter>
    </UiSheetContent>
  </UiSheet>
</template>
