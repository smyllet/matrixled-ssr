<script setup lang="ts">
import { useFieldValue } from 'vee-validate'

/**
 * The lease is stored in seconds, which is what the API and the renderer
 * speak, but nobody picks a lease in seconds: 604 800 says "a week" to no one.
 * The list covers what a panel is actually given — a short revocation window,
 * a day, the default week, a month — and `NO_OFFLINE_GRACE` the lease that
 * never expires. Anything else is typed in.
 */
const NO_OFFLINE_GRACE = 0
const OFFLINE_GRACE_PRESETS = [60, 3600, 86400, 604800, 2592000, NO_OFFLINE_GRACE]

const { t } = useI18n()

const value = useFieldValue<number>('offlineGrace')

/**
 * A device already carrying a lease nobody would have picked from the list
 * opens on the free-form input rather than silently snapping to a preset.
 * Read once, at mount: the sheet unmounts its content when it closes, so a
 * reopened sheet asks the question again on the stored value.
 */
const custom = ref(!OFFLINE_GRACE_PRESETS.includes(value.value ?? NO_OFFLINE_GRACE))

function label(seconds: number) {
  if (seconds === NO_OFFLINE_GRACE) {
    return t('components.offlineGrace.unlimited')
  }

  if (seconds < 3600) {
    const minutes = seconds / 60

    return t('components.offlineGrace.minutes', { count: minutes }, minutes)
  }

  if (seconds < 86400) {
    const hours = seconds / 3600

    return t('components.offlineGrace.hours', { count: hours }, hours)
  }

  const days = seconds / 86400

  return t('components.offlineGrace.days', { count: days }, days)
}
</script>

<template>
  <UiFormField v-slot="{ value: current, handleChange }" name="offlineGrace">
    <UiFormItem>
      <div class="flex items-center justify-between gap-2">
        <UiFormLabel>
          {{
            custom ? t('components.offlineGrace.labelSeconds') : t('components.offlineGrace.label')
          }}
        </UiFormLabel>
        <UiButton
          type="button"
          variant="link"
          size="sm"
          class="h-auto cursor-pointer p-0 text-xs"
          @click="custom = !custom"
        >
          {{
            custom
              ? t('components.offlineGrace.usePresets')
              : t('components.offlineGrace.useCustom')
          }}
        </UiButton>
      </div>

      <template v-if="custom">
        <UiFormControl>
          <UiNumberField
            :model-value="current"
            :min="0"
            :step="60"
            @update:model-value="handleChange"
          >
            <UiNumberFieldContent>
              <UiNumberFieldDecrement />
              <UiNumberFieldInput />
              <UiNumberFieldIncrement />
            </UiNumberFieldContent>
            <UiFormMessage />
          </UiNumberField>
        </UiFormControl>
      </template>

      <template v-else>
        <UiSelect :model-value="String(current)" @update:model-value="handleChange(Number($event))">
          <UiFormControl>
            <UiSelectTrigger class="w-full cursor-pointer">
              <UiSelectValue />
            </UiSelectTrigger>
          </UiFormControl>
          <UiSelectContent>
            <UiSelectItem
              v-for="seconds in OFFLINE_GRACE_PRESETS"
              :key="seconds"
              :value="String(seconds)"
            >
              {{ label(seconds) }}
            </UiSelectItem>
          </UiSelectContent>
        </UiSelect>
        <UiFormMessage />
      </template>

      <UiFormDescription>
        {{ t('components.offlineGrace.description') }}
      </UiFormDescription>
    </UiFormItem>
  </UiFormField>
</template>
