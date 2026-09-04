<script setup lang="ts">
import { PROTOCOL_MAXIMUM_PIXELS } from '@matrixled-ssr/backend/constants/protocol'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import z from 'zod'

const props = defineProps<{
  scene: {
    id: string
    name: string
    width: number
    height: number
    targetFps: number
  }
}>()

const { t } = useI18n()
const { $api } = useNuxtApp()

const open = ref(false)

const editionError = ref<string | null>(null)

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
        message: t('sheets.editScene.validation.geometry', { max: PROTOCOL_MAXIMUM_PIXELS }),
        path: ['height'],
      })
  )
)

const form = useForm({
  validationSchema: formSchema,
  initialValues: {
    name: props.scene.name,
    width: props.scene.width,
    height: props.scene.height,
    targetFps: props.scene.targetFps,
  },
})

watch(
  () => props.scene,
  (scene) => {
    form.setValues({
      name: scene.name,
      width: scene.width,
      height: scene.height,
      targetFps: scene.targetFps,
    })
  }
)

const onSubmit = form.handleSubmit(async (values) => {
  editionError.value = null

  const [_, error] = await $api
    .request('scenes.patch', {
      params: { id: props.scene.id },
      body: values,
    })
    .safe()

  if (error) {
    editionError.value = t('sheets.editScene.failure.unknownDescription')

    return
  }

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
        <UiSheetTitle>{{ t('sheets.editScene.title') }}</UiSheetTitle>
      </UiSheetHeader>

      <div class="grid flex-1 auto-rows-min gap-6 px-4">
        <UiAlert v-if="editionError" variant="destructive">
          <UiAlertTitle>{{ t('sheets.editScene.failure.title') }}</UiAlertTitle>
          <UiAlertDescription>{{ editionError }}</UiAlertDescription>
        </UiAlert>

        <form @submit.prevent="onSubmit" id="edit-scene-form">
          <div class="grid flex-1 auto-rows-min gap-6">
            <UiFormField v-slot="{ componentField }" name="name">
              <UiFormItem>
                <UiFormLabel>{{ t('sheets.editScene.fields.name') }}</UiFormLabel>
                <UiFormControl>
                  <UiInput v-bind="componentField" />
                </UiFormControl>
                <UiFormMessage />
              </UiFormItem>
            </UiFormField>

            <div class="grid grid-cols-2 gap-4">
              <UiFormField v-slot="{ componentField }" name="width">
                <UiFormItem>
                  <UiFormControl>
                    <UiNumberField v-bind="componentField" :min="1" :step="1">
                      <UiFormLabel>{{ t('sheets.editScene.fields.width') }}</UiFormLabel>
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
                    <UiNumberField v-bind="componentField" :min="1" :step="1">
                      <UiFormLabel>{{ t('sheets.editScene.fields.height') }}</UiFormLabel>
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
                  {{ t('sheets.editScene.fields.targetFps') }} ({{ value }})
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
          form="edit-scene-form"
          class="w-full"
          :disabled="!form.meta.value.valid || form.meta.value.pending"
        >
          <template v-if="form.meta.value.pending">
            <UiSpinner class="animate-spin" />
          </template>
          <template v-else>
            {{ t('sheets.editScene.submit') }}
          </template>
        </UiButton>

        <UiSheetClose as-child>
          <UiButton variant="outline">
            {{ t('sheets.editScene.cancel') }}
          </UiButton>
        </UiSheetClose>
      </UiSheetFooter>
    </UiSheetContent>
  </UiSheet>
</template>
