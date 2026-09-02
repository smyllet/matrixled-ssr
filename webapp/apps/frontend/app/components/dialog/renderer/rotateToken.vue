<script setup lang="ts">
import { AlertCircleIcon } from 'lucide-vue-next'

const props = defineProps<{
  renderer: {
    id: string
    name: string
  }
}>()

const { t } = useI18n()
const { $api } = useNuxtApp()

const rotationError = ref<string | null>(null)

const open = ref(false)

/**
 * Shown once, exactly like at creation: the previous token stops working the
 * moment this one is issued.
 */
const issuedToken = ref<string | null>(null)

async function rotateToken() {
  rotationError.value = null

  const [data, error] = await $api
    .request('renderers.token', {
      params: { id: props.renderer.id },
    })
    .safe()

  if (error) {
    rotationError.value = t('dialogs.rotateRendererToken.failure.unknownDescription')
    return
  }

  issuedToken.value = data.data.token
}

function close() {
  issuedToken.value = null
  rotationError.value = null
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
          {{ t('dialogs.rotateRendererToken.title') }}
        </UiAlertDialogTitle>
        <UiAlertDialogDescription>
          <UiAlert v-if="rotationError" variant="destructive">
            <AlertCircleIcon />
            <UiAlertTitle>{{ t('dialogs.rotateRendererToken.failure.title') }}</UiAlertTitle>
            <UiAlertDescription>
              {{ rotationError }}
            </UiAlertDescription>
          </UiAlert>

          <i18n-t
            v-if="!issuedToken"
            keypath="dialogs.rotateRendererToken.description"
            scope="global"
          >
            <span class="font-medium">{{ props.renderer.name }}</span>
          </i18n-t>
        </UiAlertDialogDescription>
      </UiAlertDialogHeader>

      <RendererTokenReveal v-if="issuedToken" :token="issuedToken" />

      <UiAlertDialogFooter>
        <UiAlertDialogAction v-if="issuedToken" asChild>
          <UiButton class="cursor-pointer" @click="close()">
            {{ t('dialogs.rotateRendererToken.done') }}
          </UiButton>
        </UiAlertDialogAction>

        <template v-else>
          <UiAlertDialogCancel class="cursor-pointer">
            {{ t('dialogs.rotateRendererToken.cancel') }}
          </UiAlertDialogCancel>
          <UiButton class="cursor-pointer" @click="rotateToken()">
            {{ t('dialogs.rotateRendererToken.confirm') }}
          </UiButton>
        </template>
      </UiAlertDialogFooter>
    </UiAlertDialogContent>
  </UiAlertDialog>
</template>
