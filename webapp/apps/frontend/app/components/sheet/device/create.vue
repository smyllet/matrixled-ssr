<script setup lang="ts">
import {
  DEVICE_DEFAULT_BRIGHTNESS,
  DEVICE_DEFAULT_OFFLINE_GRACE,
  DEVICE_MAXIMUM_BRIGHTNESS,
  DEVICE_MAXIMUM_INTEGER,
  DEVICE_MAXIMUM_MAX_FPS,
} from '@matrixled-ssr/backend/constants/device'
import { PROTOCOL_MAXIMUM_PIXELS } from '@matrixled-ssr/backend/constants/protocol'
import { isDisplayable } from '@matrixled-ssr/backend/shared/geometry'
import { AlertCircleIcon, ChevronsUpDown } from 'lucide-vue-next'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import z from 'zod'

/**
 * `maxFps` is nullable — no emission cap — and a slider cannot hold `null`, so
 * the bottom of its range stands for it and is mapped back on submit.
 */
const NO_MAX_FPS = 0

/**
 * Same sentinel as the emission cap, for the same reason: `null` is a value on
 * the server — a lease that never expires — and no control can hold it.
 */
const NO_OFFLINE_GRACE = 0

const props = defineProps<{
  scenes: { id: string; name: string; width: number; height: number }[]
}>()

/**
 * The scene field answers three things at once — none, this existing one, or
 * one made for this device — so it holds a string rather than an id, and the
 * two sentinels are values the API can never send back.
 */
const NO_SCENE = 'none'
const GENERATE_SCENE = 'new'

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

/**
 * `chainLength` is deliberately absent: the column exists and defaults to 1,
 * but nothing reads it yet — it is wiring information for a firmware that does
 * not exist. It gets a control once it has a concrete use.
 */
const formSchema = computed(() =>
  toTypedSchema(
    z
      .object({
        name: z.string().min(3).max(100),
        width: z.coerce.number().int().min(1),
        height: z.coerce.number().int().min(1),
        kind: z.enum(['hardware', 'simulator']),
        brightness: z.coerce.number().int().min(0).max(DEVICE_MAXIMUM_BRIGHTNESS),
        maxFps: z.coerce.number().int().min(NO_MAX_FPS).max(DEVICE_MAXIMUM_MAX_FPS),
        offlineGrace: z.coerce.number().int().min(NO_OFFLINE_GRACE).max(DEVICE_MAXIMUM_INTEGER),
        scene: z.string(),
      })
      .refine((values) => values.width * values.height <= PROTOCOL_MAXIMUM_PIXELS, {
        message: t('sheets.createDevice.validation.geometry', { max: PROTOCOL_MAXIMUM_PIXELS }),
        path: ['height'],
      })
      /**
       * The selector only lists compatible scenes, but a geometry edited after
       * the scene was picked can invalidate the pair. The server refuses it;
       * so does this, before the request is sent.
       */
      .refine(
        (values) => {
          if (values.scene === NO_SCENE || values.scene === GENERATE_SCENE) return true

          const scene = props.scenes.find((candidate) => candidate.id === values.scene)

          return scene !== undefined && isDisplayable(values, scene)
        },
        { message: t('sheets.createDevice.validation.scene'), path: ['scene'] }
      )
  )
)

const form = useForm({
  validationSchema: formSchema,
  /**
   * The advanced options live in a collapsible, and closing it unmounts the
   * fields inside. vee-validate drops the value of a field it sees unmount, so
   * without this a device folded back to its summary would be created with no
   * brightness and no cap at all — the fields are hidden here, never withdrawn.
   * `useReseedOnOpen` resets the form, so this keeps no draft across a close.
   */
  keepValuesOnUnmount: true,
  initialValues: {
    name: '',
    width: 64,
    height: 32,
    kind: 'hardware' as const,
    brightness: DEVICE_DEFAULT_BRIGHTNESS,
    maxFps: NO_MAX_FPS,
    offlineGrace: DEVICE_DEFAULT_OFFLINE_GRACE,
    scene: NO_SCENE,
  },
})

useReseedOnOpen(open, form)

/**
 * Recomputed from the geometry being typed, not from a stored one: raising the
 * device to 128x64 offers a 64x32 scene straight away.
 */
const compatibleScenes = computed(() => {
  const geometry = { width: form.values.width ?? 0, height: form.values.height ?? 0 }

  if (!geometry.width || !geometry.height) return []

  return props.scenes.filter((scene) => isDisplayable(geometry, scene))
})

const onSubmit = form.handleSubmit(async ({ scene, ...values }) => {
  creationError.value = null

  const [data, error] = await $api
    .request('devices.store', {
      body: {
        ...values,
        maxFps: values.maxFps === NO_MAX_FPS ? null : values.maxFps,
        offlineGrace: values.offlineGrace === NO_OFFLINE_GRACE ? null : values.offlineGrace,
        /**
         * One field, three answers: no scene, an existing one, or one made for
         * this device — which the API derives entirely from the payload it
         * already has, hence a flag rather than a second object.
         */
        createScene: scene === GENERATE_SCENE ? true : undefined,
        sceneId: scene === NO_SCENE || scene === GENERATE_SCENE ? undefined : scene,
      },
    })
    .safe()

  if (error) {
    creationError.value =
      validationMessage(error) ?? t('sheets.createDevice.failure.unknownDescription')

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

            <!-- items-start: a validation message under one field must not shift the other -->
            <div class="grid grid-cols-2 items-start gap-4">
              <!--
                Bound explicitly rather than with `v-bind="componentField"`: that
                spread also lands vee-validate's `onChange` on the field root,
                where the input's native change event bubbles at blur — and
                vee-validate would then store the *formatted* string ("604,800"),
                which coerces to NaN and empties the field.
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

            <UiFormField v-slot="{ componentField }" name="scene">
              <UiFormItem>
                <UiFormLabel>{{ t('sheets.createDevice.fields.scene') }}</UiFormLabel>
                <UiSelect v-bind="componentField">
                  <UiFormControl>
                    <UiSelectTrigger class="w-full cursor-pointer">
                      <UiSelectValue />
                    </UiSelectTrigger>
                  </UiFormControl>
                  <UiSelectContent>
                    <UiSelectItem :value="NO_SCENE">
                      {{ t('sheets.createDevice.fields.noScene') }}
                    </UiSelectItem>

                    <UiSelectSeparator />

                    <UiSelectItem :value="GENERATE_SCENE">
                      {{ t('sheets.createDevice.fields.generateScene') }}
                    </UiSelectItem>

                    <!-- No rule above an empty list: the scenes are what it separates. -->
                    <UiSelectSeparator v-if="compatibleScenes.length > 0" />

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
                  {{ t('sheets.createDevice.fields.sceneDescription') }}
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

                <OfflineGraceField />
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
