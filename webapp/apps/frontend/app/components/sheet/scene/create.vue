<script setup lang="ts">
import { PROTOCOL_MAXIMUM_PIXELS } from '@matrixled-ssr/backend/constants/protocol'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import z from 'zod'

const { t } = useI18n()
const { $api } = useNuxtApp()

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
      .refine((values) => values.width * values.height <= PROTOCOL_MAXIMUM_PIXELS, {
        message: t('sheets.createScene.validation.geometry', { max: PROTOCOL_MAXIMUM_PIXELS }),
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

useReseedOnOpen(open, form)

const onSubmit = form.handleSubmit(async (values) => {
  creationError.value = null

  const [_, error] = await $api
    .request('scenes.store', {
      body: values,
    })
    .safe()

  if (error) {
    creationError.value =
      validationMessage(error) ?? t('sheets.createScene.failure.unknownDescription')

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

            <!-- items-start: a validation message under one field must not shift the other -->
            <div class="grid grid-cols-2 items-start gap-4">
              <!--
                Bound explicitly rather than with `v-bind="componentField"`: that
                spread also lands vee-validate's `onChange` on the field root,
                where the input's native change event bubbles at blur — and
                vee-validate would then store the *formatted* string a number
                field shows once it is long enough to be grouped, which coerces
                to NaN and empties the field.
              -->
              <UiFormField v-slot="{ value, handleChange }" name="width">
                <UiFormItem>
                  <UiFormControl>
                    <UiNumberField
                      :model-value="value"
                      @update:model-value="handleChange"
                      :defaultValue="64"
                      :min="1"
                      :step="1"
                    >
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

              <UiFormField v-slot="{ value, handleChange }" name="height">
                <UiFormItem>
                  <UiFormControl>
                    <UiNumberField
                      :model-value="value"
                      @update:model-value="handleChange"
                      :defaultValue="32"
                      :min="1"
                      :step="1"
                    >
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
            </div>

            <UiFormField v-slot="{ value, handleChange }" name="targetFps">
              <UiFormItem>
                <UiFormLabel>
                  {{ t('sheets.createScene.fields.targetFps') }} ({{ value }})
                </UiFormLabel>
                <UiFormControl>
                  <UiSlider
                    :model-value="[value]"
                    :min="1"
                    :max="60"
                    :step="1"
                    @update:model-value="(v) => handleChange(v?.[0] ?? value)"
                  />
                </UiFormControl>
                <UiFormMessage />
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
