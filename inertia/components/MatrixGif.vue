<script setup lang="ts">
import type Matrix from '#models/matrix'
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

const transmit = useTransmit()

const subscription = transmit.subscription(`matrix/${props.matrix.id}/render`)
let stopListening: (() => void) | undefined = undefined

onMounted(async () => {
  await fetchGif()
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
  <img class="w-full aspect-video object-contain" :src="gif" alt="Matrix render" />
</template>
