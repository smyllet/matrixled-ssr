<script setup lang="ts">
import { Trash } from 'lucide-vue-next'

definePageMeta({
  breadcrumb: [{ label: 'nav.platform' }, { label: 'nav.matrices', to: '/' }],
})

const { $api, hook } = useNuxtApp()

const {
  data: matrices,
  pending,
  refresh,
} = useAsyncData('matrices', async () => {
  const [data, error] = await $api.request('matrices.index', {}).safe()

  if (error) {
    return []
  }

  return data.data
})

hook('app:matrix:created', async () => {
  await refresh()
})
hook('app:matrix:deleted', async () => {
  await refresh()
})
hook('app:matrix:updated', async () => {
  await refresh()
})
</script>

<template>
  <div>
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <h2 class="text-2xl font-semibold tracking-tight">
          {{ $t('pages.home.modules.matrices.title') }}
        </h2>
        <UiSpinner v-if="pending" />
        <span v-else class="text-md text-gray-500">({{ matrices?.length ?? 0 }})</span>
      </div>
      <SheetMatrixCreate>
        <UiButton>
          {{ $t('pages.home.modules.matrices.actions.create') }}
        </UiButton>
      </SheetMatrixCreate>
    </div>

    <UiTable>
      <UiTableHeader>
        <UiTableRow>
          <UiTableHead>
            {{ $t('pages.home.modules.matrices.table.name') }}
          </UiTableHead>
          <UiTableHead>
            {{ $t('pages.home.modules.matrices.table.size') }}
          </UiTableHead>
        </UiTableRow>
      </UiTableHeader>
      <UiTableBody>
        <UiTableRow v-for="matrix in matrices" :key="matrix.id">
          <UiTableCell>{{ matrix.name }}</UiTableCell>
          <UiTableCell>{{ matrix.height }} x {{ matrix.width }}</UiTableCell>
          <UiTableCell class="text-right">
            <DialogMatrixDelete :matrix="matrix">
              <UiButton
                variant="destructive"
                size="icon"
                :aria-label="$t('pages.home.modules.matrices.actions.delete')"
                class="cursor-pointer"
              >
                <Trash />
              </UiButton>
            </DialogMatrixDelete>
          </UiTableCell>
        </UiTableRow>
      </UiTableBody>
    </UiTable>
  </div>
</template>
