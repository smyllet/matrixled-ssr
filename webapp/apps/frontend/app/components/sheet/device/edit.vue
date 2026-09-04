<script setup lang="ts">
import {
  DEVICE_MAXIMUM_BRIGHTNESS,
  DEVICE_MAXIMUM_MAX_FPS,
} from '@matrixled-ssr/backend/constants/device'
import { PROTOCOL_MAXIMUM_PIXELS } from '@matrixled-ssr/backend/constants/protocol'
import { isDisplayable } from '@matrixled-ssr/backend/shared/geometry'
import { AlertCircleIcon } from 'lucide-vue-next'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import z from 'zod'

const props = defineProps<{
  device: {
    id: string
    name: string
    width: number
    height: number
    brightness: number
    maxFps: number | null
    offlineGrace: number | null
    rendererId: string
    sceneId: string | null
  }
  scenes: { id: string; name: string; width: number; height: number }[]
  renderers: { id: string; name: string }[]
}>()

/**
 * Three fields of this form are nullable on the server and `null` is a value
 * there, not an absence — no emission cap, a lease that never expires, no
 * scene assigned. None of the three controls can hold `null`, so each gets a
 * sentinel at the bottom of its range, mapped back on submit.
 */
const NO_MAX_FPS = 0
const NO_OFFLINE_GRACE = 0
const NO_SCENE = 'none'

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
        brightness: z.coerce.number().int().min(0).max(DEVICE_MAXIMUM_BRIGHTNESS),
        maxFps: z.coerce.number().int().min(NO_MAX_FPS).max(DEVICE_MAXIMUM_MAX_FPS),
        offlineGrace: z.coerce.number().int().min(NO_OFFLINE_GRACE),
        rendererId: z.string().uuid(),
        sceneId: z.string(),
      })
      .refine((values) => values.width * values.height <= PROTOCOL_MAXIMUM_PIXELS, {
        message: t('sheets.editDevice.validation.geometry', { max: PROTOCOL_MAXIMUM_PIXELS }),
        path: ['height'],
      })
      /**
       * The selector only lists compatible scenes, but a geometry edited after
       * the scene was picked can invalidate the pair. The server refuses it;
       * so does this, before the request is sent.
       */
      .refine(
        (values) => {
          if (values.sceneId === NO_SCENE) return true

          const scene = props.scenes.find((candidate) => candidate.id === values.sceneId)

          return scene !== undefined && isDisplayable(values, scene)
        },
        {
          message: t('sheets.editDevice.validation.scene'),
          path: ['sceneId'],
        }
      )
  )
)

const form = useForm({
  validationSchema: formSchema,
  initialValues: valuesOf(props.device),
})

function valuesOf(device: (typeof props)['device']) {
  return {
    name: device.name,
    width: device.width,
    height: device.height,
    brightness: device.brightness,
    maxFps: device.maxFps ?? NO_MAX_FPS,
    offlineGrace: device.offlineGrace ?? NO_OFFLINE_GRACE,
    rendererId: device.rendererId,
    sceneId: device.sceneId ?? NO_SCENE,
  }
}

/**
 * The sheet unmounts its content when it closes, and vee-validate drops every
 * field it sees unmount — a form reopened would come back empty. Reseeding on
 * open is the answer rather than keeping the values across the close: a sheet
 * dismissed with Cancel must come back showing the stored device, not the
 * edits that were abandoned.
 */
watch([() => props.device, open], () => {
  form.setValues(valuesOf(props.device))
})

/**
 * Recomputed from the geometry being edited, not from the stored one: raising
 * the device to 128×64 makes a 64×32 scene selectable straight away.
 */
const compatibleScenes = computed(() => {
  const geometry = {
    width: form.values.width ?? props.device.width,
    height: form.values.height ?? props.device.height,
  }

  return props.scenes.filter((scene) => isDisplayable(geometry, scene))
})

const onSubmit = form.handleSubmit(async (values) => {
  editionError.value = null

  const [_, error] = await $api
    .request('devices.patch', {
      params: { id: props.device.id },
      body: {
        ...values,
        maxFps: values.maxFps === NO_MAX_FPS ? null : values.maxFps,
        offlineGrace: values.offlineGrace === NO_OFFLINE_GRACE ? null : values.offlineGrace,
        sceneId: values.sceneId === NO_SCENE ? null : values.sceneId,
      },
    })
    .safe()

  if (error) {
    editionError.value = t('sheets.editDevice.failure.unknownDescription')

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
    <UiSheetContent class="overflow-y-auto">
      <UiSheetHeader>
        <UiSheetTitle>{{ t('sheets.editDevice.title') }}</UiSheetTitle>
      </UiSheetHeader>

      <div class="grid flex-1 auto-rows-min gap-6 px-4">
        <UiAlert v-if="editionError" variant="destructive">
          <AlertCircleIcon />
          <UiAlertTitle>{{ t('sheets.editDevice.failure.title') }}</UiAlertTitle>
          <UiAlertDescription>{{ editionError }}</UiAlertDescription>
        </UiAlert>

        <form @submit.prevent="onSubmit" id="edit-device-form">
          <div class="grid flex-1 auto-rows-min gap-6">
            <UiFormField v-slot="{ componentField }" name="name">
              <UiFormItem>
                <UiFormLabel>{{ t('sheets.editDevice.fields.name') }}</UiFormLabel>
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
                      <UiFormLabel>{{ t('sheets.editDevice.fields.width') }}</UiFormLabel>
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
                      <UiFormLabel>{{ t('sheets.editDevice.fields.height') }}</UiFormLabel>
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

            <UiFormField v-slot="{ componentField }" name="sceneId">
              <UiFormItem>
                <UiFormLabel>{{ t('sheets.editDevice.fields.scene') }}</UiFormLabel>
                <UiSelect v-bind="componentField">
                  <UiFormControl>
                    <UiSelectTrigger class="w-full cursor-pointer">
                      <UiSelectValue />
                    </UiSelectTrigger>
                  </UiFormControl>
                  <UiSelectContent>
                    <UiSelectItem :value="NO_SCENE">
                      {{ t('sheets.editDevice.fields.noScene') }}
                    </UiSelectItem>
                    <UiSelectItem
                      v-for="scene in compatibleScenes"
                      :key="scene.id"
                      :value="scene.id"
                    >
                      {{ scene.name }} ({{ scene.width }} x {{ scene.height }})
                    </UiSelectItem>
                  </UiSelectContent>
                </UiSelect>
                <UiFormDescription>
                  {{ t('sheets.editDevice.fields.sceneDescription') }}
                </UiFormDescription>
                <UiFormMessage />
              </UiFormItem>
            </UiFormField>

            <UiFormField v-slot="{ componentField }" name="rendererId">
              <UiFormItem>
                <UiFormLabel>{{ t('sheets.editDevice.fields.renderer') }}</UiFormLabel>
                <UiSelect v-bind="componentField">
                  <UiFormControl>
                    <UiSelectTrigger class="w-full cursor-pointer">
                      <UiSelectValue />
                    </UiSelectTrigger>
                  </UiFormControl>
                  <UiSelectContent>
                    <UiSelectItem
                      v-for="renderer in props.renderers"
                      :key="renderer.id"
                      :value="renderer.id"
                    >
                      {{ renderer.name }}
                    </UiSelectItem>
                  </UiSelectContent>
                </UiSelect>
                <UiFormMessage />
              </UiFormItem>
            </UiFormField>

            <UiFormField v-slot="{ value, handleChange }" name="brightness">
              <UiFormItem>
                <UiFormLabel>
                  {{ t('sheets.editDevice.fields.brightness') }} ({{ value }})
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
                  {{ t('sheets.editDevice.fields.maxFps') }}
                  ({{
                    value === NO_MAX_FPS ? t('sheets.editDevice.fields.maxFpsUncapped') : value
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
                  {{ t('sheets.editDevice.fields.maxFpsDescription') }}
                </UiFormDescription>
                <UiFormMessage />
              </UiFormItem>
            </UiFormField>

            <UiFormField v-slot="{ componentField }" name="offlineGrace">
              <UiFormItem>
                <UiFormControl>
                  <UiNumberField v-bind="componentField" :min="0" :step="60">
                    <UiFormLabel>
                      {{ t('sheets.editDevice.fields.offlineGrace') }}
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
                  {{ t('sheets.editDevice.fields.offlineGraceDescription') }}
                </UiFormDescription>
              </UiFormItem>
            </UiFormField>
          </div>
        </form>
      </div>

      <UiSheetFooter>
        <UiButton
          type="submit"
          form="edit-device-form"
          class="w-full"
          :disabled="!form.meta.value.valid || form.meta.value.pending"
        >
          <template v-if="form.meta.value.pending">
            <UiSpinner class="animate-spin" />
          </template>
          <template v-else>
            {{ t('sheets.editDevice.submit') }}
          </template>
        </UiButton>

        <UiSheetClose as-child>
          <UiButton variant="outline">
            {{ t('sheets.editDevice.cancel') }}
          </UiButton>
        </UiSheetClose>
      </UiSheetFooter>
    </UiSheetContent>
  </UiSheet>
</template>
