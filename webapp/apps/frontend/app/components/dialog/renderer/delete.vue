<script setup lang="ts">
import { AlertCircleIcon } from 'lucide-vue-next'

const props = defineProps<{
  renderer: {
    id: string
    name: string
  }
}>()

const { t } = useI18n()
const { $api, callHook } = useNuxtApp()

const deleteError = ref<string | null>(null)

const open = ref(false)

async function deleteRenderer() {
  deleteError.value = null

  const [_, error] = await $api
    .request('renderers.delete', {
      params: { id: props.renderer.id },
    })
    .safe()

  if (error) {
    deleteError.value = t('dialogs.deleteRenderer.failure.unknownDescription')
    return
  }

  await callHook('app:renderer:deleted', props.renderer.id)

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
          {{ t('dialogs.deleteRenderer.title') }}
        </UiAlertDialogTitle>
        <UiAlertDialogDescription>
          <UiAlert v-if="deleteError" variant="destructive">
            <AlertCircleIcon />
            <UiAlertTitle>{{ t('dialogs.deleteRenderer.failure.title') }}</UiAlertTitle>
            <UiAlertDescription>
              {{ deleteError }}
            </UiAlertDescription>
          </UiAlert>

          <i18n-t keypath="dialogs.deleteRenderer.description" scope="global">
            <span class="font-medium">{{ props.renderer.name }}</span>
          </i18n-t>
        </UiAlertDialogDescription>
      </UiAlertDialogHeader>
      <UiAlertDialogFooter>
        <UiAlertDialogCancel class="cursor-pointer">
          {{ t('dialogs.deleteRenderer.cancel') }}
        </UiAlertDialogCancel>
        <UiAlertDialogAction asChild>
          <UiButton class="cursor-pointer" variant="destructive" @click="deleteRenderer()">
            {{ t('dialogs.deleteRenderer.confirm') }}
          </UiButton>
        </UiAlertDialogAction>
      </UiAlertDialogFooter>
    </UiAlertDialogContent>
  </UiAlertDialog>
</template>
