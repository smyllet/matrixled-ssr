<script setup lang="ts">
const { t } = useI18n()

const connectionLost = useDashboardConnectionLost()
</script>

<template>
  <UiAlert v-if="connectionLost" variant="destructive">
    <UiAlertTitle>{{ t('components.connectionLost.title') }}</UiAlertTitle>
    <UiAlertDescription>{{ t('components.connectionLost.description') }}</UiAlertDescription>
    <UiButton variant="outline" size="sm" class="col-start-2 mt-2 w-fit" @click="reloadNuxtApp()">
      {{ t('components.connectionLost.reload') }}
    </UiButton>
  </UiAlert>
</template>
