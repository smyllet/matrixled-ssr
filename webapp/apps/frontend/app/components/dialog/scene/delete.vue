<script setup lang="ts">
import { AlertCircleIcon } from 'lucide-vue-next'

const props = defineProps<{
  scene: {
    id: string
    name: string
  }
}>()

const { t } = useI18n()
const { $api } = useNuxtApp()

const deleteError = ref<string | null>(null)

const open = ref(false)

async function deleteScene() {
  deleteError.value = null

  const [_, error] = await $api
    .request('scenes.delete', {
      params: { id: props.scene.id },
    })
    .safe()

  if (error) {
    deleteError.value = t('dialogs.deleteScene.failure.unknownDescription')
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
          {{ t('dialogs.deleteScene.title') }}
        </UiAlertDialogTitle>
        <UiAlertDialogDescription>
          <UiAlert v-if="deleteError" variant="destructive">
            <AlertCircleIcon />
            <UiAlertTitle>{{ t('dialogs.deleteScene.failure.title') }}</UiAlertTitle>
            <UiAlertDescription>
              {{ deleteError }}
            </UiAlertDescription>
          </UiAlert>

          <i18n-t keypath="dialogs.deleteScene.description" scope="global">
            <span class="font-medium">{{ props.scene.name }}</span>
          </i18n-t>
        </UiAlertDialogDescription>
      </UiAlertDialogHeader>
      <UiAlertDialogFooter>
        <UiAlertDialogCancel class="cursor-pointer">
          {{ t('dialogs.deleteScene.cancel') }}
        </UiAlertDialogCancel>
        <UiAlertDialogAction asChild>
          <UiButton class="cursor-pointer" variant="destructive" @click="deleteScene()">
            {{ t('dialogs.deleteScene.confirm') }}
          </UiButton>
        </UiAlertDialogAction>
      </UiAlertDialogFooter>
    </UiAlertDialogContent>
  </UiAlertDialog>
</template>
