<script lang="ts" setup>
import type Matrix from '#models/matrix'
import { router } from '@inertiajs/vue3'
import Button from 'primevue/button'
import Card from 'primevue/card'
import { onMounted, onUnmounted, ref } from 'vue'
import { useTransmit } from '~/composables/use_transmit'

const props = defineProps<{
  matrix: Matrix
}>()

const gif = ref<string>('')

const fetchGif = async () => {
  const response = await fetch(`http://localhost:3333/matrices/${props.matrix.id}/render`)
  const blob = await response.blob()
  try {
    const reader = new FileReader()
    reader.onload = function () {
      gif.value = reader.result as string
    }
    reader.readAsDataURL(blob)
  } catch (e) {
    console.error(e)
  }
}

fetchGif()

const transmit = useTransmit()

const subscription = transmit.subscription(`matrix/${props.matrix.id}/render`)
let stopListening: () => void

onMounted(async () => {
  await subscription.create()
  stopListening = subscription.onMessage(() => {
    fetchGif()
  })
})

onUnmounted(async () => {
  await subscription.delete()
  if (stopListening) {
    stopListening()
  }
})
</script>
<template>
  <Card class="w-96 overflow-hidden">
    <template #header>
      <img class="w-full aspect-video object-contain" :src="gif" />
    </template>
    <template #title>
      {{ matrix.name }}
    </template>
    <template #subtitle> {{ matrix.width }} x {{ matrix.height }} </template>
    <template #footer>
      <div class="flex gap-4 mt-1">
        <Button
          label="Edit"
          icon="pi pi-cog"
          class="w-full"
          @click="router.get(`/matrices/${matrix.id}/edit`)"
        />
      </div>
    </template>
  </Card>
</template>
