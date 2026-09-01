<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import z from 'zod'

const { t } = useI18n()
const { $api, callHook } = useNuxtApp()

const open = ref(false)

const creationError = ref<string | null>(null)

const formSchema = computed(() =>
  toTypedSchema(
    z
      .object({
        name: z.string().min(3).max(100),
        width: z.coerce.number().int().min(1),
        height: z.coerce.number().int().min(1),
        targetFps: z.coerce.number().int().min(1).max(60),
      })
      .refine((values) => values.width * values.height <= 65536, {
        message: t('sheets.createScene.validation.geometry'),
        path: ['height'],
      })
  )
)

const form = useForm({
  validationSchema: formSchema,
  initialValues: {
    name: '',
    width: 64,
    height: 32,
    targetFps: 30,
  },
})

const onSubmit = form.handleSubmit(async (values) => {
  creationError.value = null

  const [data, error] = await $api
    .request('scenes.store', {
      body: values,
    })
    .safe()

  if (error) {
    creationError.value = t('sheets.createScene.failure.unknownDescription')

    return
  }

  form.resetForm()

  await callHook('app:scene:created', data.data)

  open.value = false
})
</script>

<template>
  <UiSheet v-model:open="open">
    <UiSheetTrigger asChild>
      <slot />
    </UiSheetTrigger>
    <UiSheetContent>
      <UiSheetHeader>
        <UiSheetTitle>{{ t('sheets.createScene.title') }}</UiSheetTitle>
      </UiSheetHeader>

      <div class="grid flex-1 auto-rows-min gap-6 px-4">
        <UiAlert v-if="creationError" variant="destructive">
          <UiAlertTitle>{{ t('sheets.createScene.failure.title') }}</UiAlertTitle>
          <UiAlertDescription>{{ creationError }}</UiAlertDescription>
        </UiAlert>

        <form @submit.prevent="onSubmit" id="create-scene-form">
          <div class="grid flex-1 auto-rows-min gap-6">
            <UiFormField v-slot="{ componentField }" name="name">
              <UiFormItem>
                <UiFormLabel>{{ t('sheets.createScene.fields.name') }}</UiFormLabel>
                <UiFormControl>
                  <UiInput v-bind="componentField" />
                </UiFormControl>
                <UiFormMessage />
              </UiFormItem>
            </UiFormField>

            <UiFormField v-slot="{ componentField }" name="width">
              <UiFormItem>
                <UiFormControl>
                  <UiNumberField v-bind="componentField" :defaultValue="64" :min="1" :step="1">
                    <UiFormLabel>{{ t('sheets.createScene.fields.width') }}</UiFormLabel>
                    <UiNumberFieldContent>
                      <UiNumberFieldDecrement />
                      <UiNumberFieldInput />
                      <UiNumberFieldIncrement />
                    </UiNumberFieldContent>
                    <UiFormMessage />
                  </UiNumberField>
                </UiFormControl>
              </UiFormItem>
            </UiFormField>

            <UiFormField v-slot="{ componentField }" name="height">
              <UiFormItem>
                <UiFormControl>
                  <UiNumberField v-bind="componentField" :defaultValue="32" :min="1" :step="1">
                    <UiFormLabel>{{ t('sheets.createScene.fields.height') }}</UiFormLabel>
                    <UiNumberFieldContent>
                      <UiNumberFieldDecrement />
                      <UiNumberFieldInput />
                      <UiNumberFieldIncrement />
                    </UiNumberFieldContent>
                    <UiFormMessage />
                  </UiNumberField>
                </UiFormControl>
              </UiFormItem>
            </UiFormField>

            <UiFormField v-slot="{ componentField }" name="targetFps">
              <UiFormItem>
                <UiFormControl>
                  <UiNumberField
                    v-bind="componentField"
                    :defaultValue="30"
                    :min="1"
                    :max="60"
                    :step="1"
                  >
                    <UiFormLabel>{{ t('sheets.createScene.fields.targetFps') }}</UiFormLabel>
                    <UiNumberFieldContent>
                      <UiNumberFieldDecrement />
                      <UiNumberFieldInput />
                      <UiNumberFieldIncrement />
                    </UiNumberFieldContent>
                    <UiFormMessage />
                  </UiNumberField>
                </UiFormControl>
              </UiFormItem>
            </UiFormField>
          </div>
        </form>
      </div>

      <UiSheetFooter>
        <UiButton
          type="submit"
          form="create-scene-form"
          class="w-full"
          :disabled="!form.meta.value.valid || form.meta.value.pending"
        >
          <template v-if="form.meta.value.pending">
            <UiSpinner class="animate-spin" />
          </template>
          <template v-else>
            {{ t('sheets.createScene.submit') }}
          </template>
        </UiButton>

        <UiSheetClose as-child>
          <UiButton variant="outline">
            {{ t('sheets.createScene.cancel') }}
          </UiButton>
        </UiSheetClose>
      </UiSheetFooter>
    </UiSheetContent>
  </UiSheet>
</template>
