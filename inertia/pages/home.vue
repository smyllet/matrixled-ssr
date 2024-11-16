<script setup lang="ts">
import { Head, router } from '@inertiajs/vue3'
import Button from 'primevue/button'

defineProps<{
  user: {
    name?: string
  }
}>()
</script>

<template>
  <Head title="Homepage" />

  <div class="flex lg:flex-row flex-col gap-4 bg-surface-0 dark:bg-surface-900">
    <div class="flex-1 flex items-center justify-center">
      <div class="p-6 pt-12 lg:p-12">
        <h1
          class="text-3xl lg:text-5xl font-bold text-surface-900 dark:text-surface-0 mb-4 lg:leading-normal text-center lg:text-left"
        >
          Matrixled-SSR <br />
          <span class="text-primary dark:text-primary">Welcome {{ user.name }} !</span>
        </h1>
        <p
          class="text-surface-700 dark:text-surface-200 leading-normal mb-8 text-center lg:text-left"
        >
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt
          ut labore et dolore magna aliqua.
        </p>
        <div class="flex items-center justify-center lg:justify-start gap-6">
          <Button label="Logout" type="button" @click="router.post('/auth/logout')" />
        </div>
      </div>
    </div>
  </div>
</template>
