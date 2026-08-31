<script setup lang="ts">
import { Check, Copy } from 'lucide-vue-next'

const props = defineProps<{
  token: string
}>()

const { t } = useI18n()

const copied = ref(false)

async function copyToken() {
  await navigator.clipboard.writeText(props.token)

  copied.value = true

  setTimeout(() => {
    copied.value = false
  }, 2000)
}
</script>

<template>
  <div class="flex flex-col gap-2 rounded-md border p-4">
    <span class="font-medium">{{ t('components.tokenReveal.title') }}</span>
    <p class="text-muted-foreground text-sm">
      {{ t('components.tokenReveal.description') }}
    </p>
    <code class="bg-muted rounded px-2 py-1 font-mono text-xs break-all">{{ props.token }}</code>
    <UiButton variant="outline" class="cursor-pointer" @click="copyToken()">
      <Check v-if="copied" />
      <Copy v-else />
      {{ copied ? t('components.tokenReveal.copied') : t('components.tokenReveal.copy') }}
    </UiButton>
  </div>
</template>
