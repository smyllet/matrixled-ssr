<script setup lang="ts">
import { AlertCircleIcon } from 'lucide-vue-next'

const props = defineProps<{
  device: {
    id: string
    name: string
  }
}>()

const { t } = useI18n()
const { $api } = useNuxtApp()

const deleteError = ref<string | null>(null)

const open = ref(false)

async function deleteDevice() {
  deleteError.value = null

  const [_, error] = await $api
    .request('devices.delete', {
      params: { id: props.device.id },
    })
    .safe()

  if (error) {
    deleteError.value = t('dialogs.deleteDevice.failure.unknownDescription')
    return
  }

  open.value = false
}
</script>

<template>
  <UiAlertDialog v-model:open="open">
    <UiAlertDialogTrigger asChild>
      <slot />
    </UiAlertDialogTrigger>
    <UiAlertDialogContent>
      <UiAlertDialogHeader>
        <UiAlertDialogTitle>
          {{ t('dialogs.deleteDevice.title') }}
        </UiAlertDialogTitle>
        <UiAlertDialogDescription>
          <UiAlert v-if="deleteError" variant="destructive">
            <AlertCircleIcon />
            <UiAlertTitle>{{ t('dialogs.deleteDevice.failure.title') }}</UiAlertTitle>
            <UiAlertDescription>
              {{ deleteError }}
            </UiAlertDescription>
          </UiAlert>

          <i18n-t keypath="dialogs.deleteDevice.description" scope="global">
            <span class="font-medium">{{ props.device.name }}</span>
          </i18n-t>
        </UiAlertDialogDescription>
      </UiAlertDialogHeader>
      <UiAlertDialogFooter>
        <UiAlertDialogCancel class="cursor-pointer">
          {{ t('dialogs.deleteDevice.cancel') }}
        </UiAlertDialogCancel>
        <UiAlertDialogAction asChild>
          <UiButton class="cursor-pointer" variant="destructive" @click="deleteDevice()">
            {{ t('dialogs.deleteDevice.confirm') }}
          </UiButton>
        </UiAlertDialogAction>
      </UiAlertDialogFooter>
    </UiAlertDialogContent>
  </UiAlertDialog>
</template>
