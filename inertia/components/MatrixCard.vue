<script lang="ts" setup>
import type Matrix from '#models/matrix'
import { router } from '@inertiajs/vue3'
import Button from 'primevue/button'
import Card from 'primevue/card'
import { useConfirm } from 'primevue/useconfirm'
import MatrixGif from './MatrixGif.vue'

defineProps<{
  matrix: Matrix
}>()

const confirmDelete = useConfirm()
</script>
<template>
  <Card class="w-96 overflow-hidden">
    <template #header>
      <MatrixGif :matrix="matrix" />
    </template>
    <template #title>
      {{ matrix.name }}
    </template>
    <template #subtitle> {{ matrix.width }} x {{ matrix.height }} </template>
    <template #footer>
      <div class="flex gap-4 mt-1">
        <Button
          label="Delete"
          icon="pi pi-trash"
          class="w-full"
          severity="danger"
          outlined
          @click="
            confirmDelete.require({
              header: 'Delete Matrix',
              message: `Are you sure you want to delete '${matrix.name}' ?`,
              acceptClass: 'p-button-danger',
              acceptLabel: 'Delete',
              rejectClass: 'p-button-secondary',
              rejectLabel: 'Cancel',
              accept: () => router.delete(`/matrices/${matrix.id}`),
            })
          "
        />
        <Button
          as="a"
          label="Edit"
          icon="pi pi-cog"
          class="w-full"
          :href="`/matrices/${matrix.id}/edit`"
        />
      </div>
    </template>
  </Card>
</template>
