<script setup lang="ts">
import {
  DEVICE_DEFAULT_BRIGHTNESS,
  DEVICE_DEFAULT_CHAIN_LENGTH,
  DEVICE_MAXIMUM_BRIGHTNESS,
  DEVICE_MAXIMUM_MAX_FPS,
} from '@matrixled-ssr/backend/constants/device'
import { PROTOCOL_MAXIMUM_PIXELS } from '@matrixled-ssr/backend/constants/protocol'
import { AlertCircleIcon, ChevronsUpDown } from 'lucide-vue-next'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import z from 'zod'

/**
 * `maxFps` is nullable — no emission cap — and a slider cannot hold `null`, so
 * the bottom of its range stands for it and is mapped back on submit.
 */
const NO_MAX_FPS = 0

const { t } = useI18n()
const { $api } = useNuxtApp()

const open = ref(false)
const advanced = ref(false)

const creationError = ref<string | null>(null)

/**
 * The clear token only exists in this response. Once the sheet is closed it is
 * gone for good, so the sheet stays open on it until the user dismisses it.
 */
const issuedToken = ref<string | null>(null)

const formSchema = computed(() =>
  toTypedSchema(
    z
      .object({
        name: z.string().min(3).max(100),
        width: z.coerce.number().int().min(1),
        height: z.coerce.number().int().min(1),
        chainLength: z.coerce.number().int().min(1),
        kind: z.enum(['hardware', 'simulator']),
        brightness: z.coerce.number().int().min(0).max(DEVICE_MAXIMUM_BRIGHTNESS),
        maxFps: z.coerce.number().int().min(NO_MAX_FPS).max(DEVICE_MAXIMUM_MAX_FPS),
      })
      .refine((values) => values.width * values.height <= PROTOCOL_MAXIMUM_PIXELS, {
        message: t('sheets.createDevice.validation.geometry', { max: PROTOCOL_MAXIMUM_PIXELS }),
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
    chainLength: DEVICE_DEFAULT_CHAIN_LENGTH,
    kind: 'hardware' as const,
    brightness: DEVICE_DEFAULT_BRIGHTNESS,
    maxFps: NO_MAX_FPS,
  },
})

const onSubmit = form.handleSubmit(async (values) => {
  creationError.value = null

  const [data, error] = await $api
    .request('devices.store', {
      body: {
        ...values,
        maxFps: values.maxFps === NO_MAX_FPS ? null : values.maxFps,
      },
    })
    .safe()

  if (error) {
    creationError.value = t('sheets.createDevice.failure.unknownDescription')

    return
  }

  form.resetForm()

  issuedToken.value = data.data.token
})

function close() {
  issuedToken.value = null
  creationError.value = null
  advanced.value = false
  open.value = false
}
</script>

<template>
  <UiSheet v-model:open="open" @update:open="!$event && close()">
    <UiSheetTrigger asChild>
      <slot />
    </UiSheetTrigger>
    <UiSheetContent class="overflow-y-auto">
      <UiSheetHeader>
        <UiSheetTitle>{{ t('sheets.createDevice.title') }}</UiSheetTitle>
      </UiSheetHeader>

      <div class="grid flex-1 auto-rows-min gap-6 px-4">
        <UiAlert v-if="creationError" variant="destructive">
          <AlertCircleIcon />
          <UiAlertTitle>{{ t('sheets.createDevice.failure.title') }}</UiAlertTitle>
          <UiAlertDescription>{{ creationError }}</UiAlertDescription>
        </UiAlert>

        <TokenReveal v-if="issuedToken" :token="issuedToken" />

        <form v-else @submit.prevent="onSubmit" id="create-device-form">
          <div class="grid flex-1 auto-rows-min gap-6">
            <UiFormField v-slot="{ componentField }" name="name">
              <UiFormItem>
                <UiFormLabel>{{ t('sheets.createDevice.fields.name') }}</UiFormLabel>
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
                    <UiNumberField v-bind="componentField" :defaultValue="64" :min="1" :step="1">
                      <UiFormLabel>{{ t('sheets.createDevice.fields.width') }}</UiFormLabel>
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
                      <UiFormLabel>{{ t('sheets.createDevice.fields.height') }}</UiFormLabel>
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

            <UiFormField v-slot="{ componentField }" name="kind">
              <UiFormItem>
                <UiFormLabel>{{ t('sheets.createDevice.fields.kind') }}</UiFormLabel>
                <UiSelect v-bind="componentField">
                  <UiFormControl>
                    <UiSelectTrigger class="w-full cursor-pointer">
                      <UiSelectValue />
                    </UiSelectTrigger>
                  </UiFormControl>
                  <UiSelectContent>
                    <UiSelectItem value="hardware">
                      {{ t('sheets.createDevice.kind.hardware') }}
                    </UiSelectItem>
                    <UiSelectItem value="simulator">
                      {{ t('sheets.createDevice.kind.simulator') }}
                    </UiSelectItem>
                  </UiSelectContent>
                </UiSelect>
                <UiFormDescription>
                  {{ t('sheets.createDevice.fields.kindDescription') }}
                </UiFormDescription>
                <UiFormMessage />
              </UiFormItem>
            </UiFormField>

            <UiCollapsible v-model:open="advanced" class="grid gap-6">
              <UiCollapsibleTrigger as-child>
                <UiButton type="button" variant="outline" class="w-full cursor-pointer">
                  {{ t('sheets.createDevice.advanced') }}
                  <ChevronsUpDown />
                </UiButton>
              </UiCollapsibleTrigger>

              <UiCollapsibleContent class="grid gap-6">
                <UiFormField v-slot="{ componentField }" name="chainLength">
                  <UiFormItem>
                    <UiFormControl>
                      <UiNumberField v-bind="componentField" :min="1" :step="1">
                        <UiFormLabel>
                          {{ t('sheets.createDevice.fields.chainLength') }}
                        </UiFormLabel>
                        <UiNumberFieldContent>
                          <UiNumberFieldDecrement />
                          <UiNumberFieldInput />
                          <UiNumberFieldIncrement />
                        </UiNumberFieldContent>
                        <UiFormMessage />
                      </UiNumberField>
                    </UiFormControl>
                    <UiFormDescription>
                      {{ t('sheets.createDevice.fields.chainLengthDescription') }}
                    </UiFormDescription>
                  </UiFormItem>
                </UiFormField>

                <UiFormField v-slot="{ value, handleChange }" name="brightness">
                  <UiFormItem>
                    <UiFormLabel>
                      {{ t('sheets.createDevice.fields.brightness') }} ({{ value }})
                    </UiFormLabel>
                    <UiFormControl>
                      <UiSlider
                        :model-value="[value]"
                        :min="0"
                        :max="DEVICE_MAXIMUM_BRIGHTNESS"
                        :step="1"
                        @update:model-value="(v) => handleChange(v?.[0] ?? value)"
                      />
                    </UiFormControl>
                    <UiFormMessage />
                  </UiFormItem>
                </UiFormField>

                <UiFormField v-slot="{ value, handleChange }" name="maxFps">
                  <UiFormItem>
                    <UiFormLabel>
                      {{ t('sheets.createDevice.fields.maxFps') }}
                      ({{
                        value === NO_MAX_FPS
                          ? t('sheets.createDevice.fields.maxFpsUncapped')
                          : value
                      }})
                    </UiFormLabel>
                    <UiFormControl>
                      <UiSlider
                        :model-value="[value]"
                        :min="NO_MAX_FPS"
                        :max="DEVICE_MAXIMUM_MAX_FPS"
                        :step="1"
                        @update:model-value="(v) => handleChange(v?.[0] ?? value)"
                      />
                    </UiFormControl>
                    <UiFormDescription>
                      {{ t('sheets.createDevice.fields.maxFpsDescription') }}
                    </UiFormDescription>
                    <UiFormMessage />
                  </UiFormItem>
                </UiFormField>
              </UiCollapsibleContent>
            </UiCollapsible>
          </div>
        </form>
      </div>

      <UiSheetFooter>
        <UiButton v-if="issuedToken" class="w-full cursor-pointer" @click="close()">
          {{ t('sheets.createDevice.done') }}
        </UiButton>

        <template v-else>
          <UiButton
            type="submit"
            form="create-device-form"
            class="w-full"
            :disabled="!form.meta.value.valid || form.meta.value.pending"
          >
            <template v-if="form.meta.value.pending">
              <UiSpinner class="animate-spin" />
            </template>
            <template v-else>
              {{ t('sheets.createDevice.submit') }}
            </template>
          </UiButton>

          <UiSheetClose as-child>
            <UiButton variant="outline">
              {{ t('sheets.createDevice.cancel') }}
            </UiButton>
          </UiSheetClose>
        </template>
      </UiSheetFooter>
    </UiSheetContent>
  </UiSheet>
</template>
