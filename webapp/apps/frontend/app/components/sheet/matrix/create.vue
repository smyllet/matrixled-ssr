<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import z from 'zod'

const { t } = useI18n()
const { $api } = useNuxtApp()

const open = ref(false)

let creationError = ref<string | null>(null)

const formSchema = computed(() =>
  toTypedSchema(
    z.object({
      name: z.string().min(3).max(100),
      width: z.coerce.number().int().min(1).max(128),
      height: z.coerce.number().int().min(1).max(128),
    })
  )
)

const form = useForm({
  validationSchema: formSchema,
  initialValues: {
    name: '',
    width: 64,
    height: 64,
  },
})

const onSubmit = form.handleSubmit(async (values) => {
  console.log('Submitting form with values:', values)
  creationError.value = null

  const [_, error] = await $api
    .request('matrices.store', {
      body: values,
    })
    .safe()

  if (error) {
    creationError.value = t('sheets.createMatrix.failure.unknownDescription')

    return
  }

  form.resetForm()

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
        <UiSheetTitle>{{ $t('sheets.createMatrix.title') }}</UiSheetTitle>
      </UiSheetHeader>
      <form @submit.prevent="onSubmit" id="create-matrix-form">
        <div class="grid flex-1 auto-rows-min gap-6 px-4">
          <UiFormField v-slot="{ componentField }" name="name">
            <UiFormItem>
              <UiFormLabel>{{ t('sheets.createMatrix.fields.name') }}</UiFormLabel>
              <UiFormControl>
                <UiInput v-bind="componentField" />
              </UiFormControl>
              <UiFormMessage />
            </UiFormItem>
          </UiFormField>

          <UiFormField v-slot="{ componentField }" name="width">
            <UiFormItem>
              <UiFormControl>
                <UiNumberField
                  v-bind="componentField"
                  :defaultValue="64"
                  :min="1"
                  :max="128"
                  :step="1"
                >
                  <UiFormLabel>{{ t('sheets.createMatrix.fields.width') }}</UiFormLabel>
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
                <UiNumberField
                  v-bind="componentField"
                  :defaultValue="64"
                  :min="1"
                  :max="128"
                  :step="1"
                >
                  <UiFormLabel>{{ t('sheets.createMatrix.fields.height') }}</UiFormLabel>
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

      <UiSheetFooter>
        <UiButton
          type="submit"
          form="create-matrix-form"
          class="w-full"
          :disabled="!form.meta.value.valid || form.meta.value.pending"
        >
          <template v-if="form.meta.value.pending">
            <UiSpinner class="animate-spin" />
          </template>
          <template v-else>
            {{ t('sheets.createMatrix.submit') }}
          </template>
        </UiButton>

        <UiSheetClose as-child>
          <UiButton variant="outline">
            {{ t('sheets.createMatrix.cancel') }}
          </UiButton>
        </UiSheetClose>
      </UiSheetFooter>
    </UiSheetContent>
  </UiSheet>
</template>
