<script setup lang="ts">
import Message from 'primevue/message'
import { computed } from 'vue'
import { usePageErrorsBag } from '~/composables/use_page_errors_bag'
import { usePageNotification } from '~/composables/use_page_notifications'

const errorsBag = usePageErrorsBag()
const notification = usePageNotification()

const errors = computed(() =>
  Object.entries(errorsBag.value ?? {})
    .filter(([key]) => key !== 'E_VALIDATION_ERROR' && key !== 'E_UNAUTHORIZED_ACCESS')
    .map(([, value]) => value)
)
</script>

<template>
  <div v-if="errors.length > 0 || notification">
    <Message severity="error" v-for="error in errors">
      {{ error }}
    </Message>
    <Message v-if="notification" :severity="notification.type" closable>
      {{ notification.message }}
    </Message>
  </div>
</template>
