<script setup lang="ts">
import { AlertCircleIcon } from 'lucide-vue-next'

const props = defineProps<{
  matrix: {
    id: string
    name: string
  }
}>()

const { t } = useI18n()
const { $api, callHook } = useNuxtApp()

let deleteError = ref<string | null>(null)

const open = ref(false)

async function deleteMatrix() {
  deleteError.value = null

  const [_, error] = await $api
    .request('matrices.delete', {
      params: { id: props.matrix.id },
    })
    .safe()

  if (error) {
    deleteError.value = t('dialogs.deleteMatrix.failure.unknownDescription')
    return
  }

  await callHook('app:matrix:deleted', props.matrix.id)

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
          {{ $t('dialogs.deleteMatrix.title') }}
        </UiAlertDialogTitle>
        <UiAlertDialogDescription>
          <UiAlert v-if="deleteError" variant="destructive">
            <AlertCircleIcon />
            <UiAlertTitle>{{ t('dialogs.deleteMatrix.failure.title') }}</UiAlertTitle>
            <UiAlertDescription>
              {{ deleteError }}
            </UiAlertDescription>
          </UiAlert>

          <i18n-t keypath="dialogs.deleteMatrix.description" scope="global">
            <span class="font-medium">{{ props.matrix.name }}</span>
          </i18n-t>
        </UiAlertDialogDescription>
      </UiAlertDialogHeader>
      <UiAlertDialogFooter>
        <UiAlertDialogCancel class="cursor-pointer">
          {{ $t('dialogs.deleteMatrix.cancel') }}
        </UiAlertDialogCancel>
        <UiAlertDialogAction asChild>
          <UiButton class="cursor-pointer" variant="destructive" @click="deleteMatrix()">
            {{ $t('dialogs.deleteMatrix.confirm') }}
          </UiButton>
        </UiAlertDialogAction>
      </UiAlertDialogFooter>
    </UiAlertDialogContent>
  </UiAlertDialog>
</template>
