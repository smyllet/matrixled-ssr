<script setup lang="ts">
import type Matrix from '#models/matrix'
import type User from '#models/user'
import { Head, router } from '@inertiajs/vue3'
import Button from 'primevue/button'
import ErrorAndNotificationDisplay from '~/components/ErrorAndNotificationDisplay.vue'
import MatrixCard from '~/components/MatrixCard.vue'
import { useWebsocket } from '~/composables/use_websocket'

defineProps<{
  user: User
  matrices: Matrix[]
}>()

const websocket = useWebsocket()

websocket.addEventListener('message', (event) => {
  console.log('Websocket message received:', JSON.parse(event.data))
})
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
          <span class="text-primary dark:text-primary">Welcome {{ user.fullName }} !</span>
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

  <ErrorAndNotificationDisplay class="p-4 pb-0" />

  <div class="flex flex-row items-center mt-8 ml-4 gap-4">
    <Button icon="pi pi-plus" aria-label="New matrix" @click="router.get('/matrices/create')" />
    <h2 class="text-2xl font-bold text-surface-900 dark:text-surface-0">Matrices</h2>
  </div>

  <div class="flex flex-row flex-wrap gap-4 p-4">
    <MatrixCard v-for="matrix in matrices" :matrix="matrix" class="w-96 overflow-hidden" />
  </div>
</template>
