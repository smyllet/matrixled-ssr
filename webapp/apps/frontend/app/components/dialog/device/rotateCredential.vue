<script setup lang="ts">
import { AlertCircleIcon } from 'lucide-vue-next'

const props = defineProps<{
  device: {
    id: string
    name: string
    kind: 'hardware' | 'simulator'
  }
}>()

const { t } = useI18n()
const { $api } = useNuxtApp()

const rotationError = ref<string | null>(null)

const open = ref(false)

/**
 * Shown once, exactly like at pairing: the previous token stops working the
 * moment this one is issued.
 */
const issuedToken = ref<string | null>(null)

async function rotateCredential() {
  rotationError.value = null

  const [data, error] = await $api
    .request('devices.credential', {
      params: { id: props.device.id },
    })
    .safe()

  if (error) {
    rotationError.value =
      validationMessage(error) ?? t('dialogs.rotateDeviceCredential.failure.unknownDescription')
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
          {{ t('dialogs.rotateDeviceCredential.title') }}
        </UiAlertDialogTitle>
        <UiAlertDialogDescription>
          <UiAlert v-if="rotationError" variant="destructive">
            <AlertCircleIcon />
            <UiAlertTitle>{{ t('dialogs.rotateDeviceCredential.failure.title') }}</UiAlertTitle>
            <UiAlertDescription>
              {{ rotationError }}
            </UiAlertDescription>
          </UiAlert>

          <i18n-t
            v-if="!issuedToken"
            :keypath="`dialogs.rotateDeviceCredential.description.${props.device.kind}`"
            scope="global"
          >
            <span class="font-medium">{{ props.device.name }}</span>
          </i18n-t>
        </UiAlertDialogDescription>
      </UiAlertDialogHeader>

      <TokenReveal v-if="issuedToken" :token="issuedToken" />

      <UiAlertDialogFooter>
        <UiAlertDialogAction v-if="issuedToken" asChild>
          <UiButton class="cursor-pointer" @click="close()">
            {{ t('dialogs.rotateDeviceCredential.done') }}
          </UiButton>
        </UiAlertDialogAction>

        <template v-else>
          <UiAlertDialogCancel class="cursor-pointer">
            {{ t('dialogs.rotateDeviceCredential.cancel') }}
          </UiAlertDialogCancel>
          <UiButton
            :variant="props.device.kind === 'hardware' ? 'destructive' : 'default'"
            class="cursor-pointer"
            @click="rotateCredential()"
          >
            {{ t('dialogs.rotateDeviceCredential.confirm') }}
          </UiButton>
        </template>
      </UiAlertDialogFooter>
    </UiAlertDialogContent>
  </UiAlertDialog>
</template>
