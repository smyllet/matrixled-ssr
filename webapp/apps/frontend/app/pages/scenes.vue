<script setup lang="ts">
import { Pencil, Trash } from 'lucide-vue-next'

definePageMeta({
  breadcrumb: [{ label: 'nav.platform' }, { label: 'nav.scenes', to: '/scenes' }],
})

const { t } = useI18n()
const { $api } = useNuxtApp()

const { data: scenes, pending } = useAsyncData('scenes', async () => {
  const [data, error] = await $api.request('scenes.index', {}).safe()

  if (error) {
    return []
  }

  return data.data
})
</script>

<template>
  <div>
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <h2 class="text-2xl font-semibold tracking-tight">
          {{ t('pages.scenes.title') }}
        </h2>
        <UiSpinner v-if="pending" />
        <span v-else class="text-md text-gray-500">({{ scenes?.length ?? 0 }})</span>
      </div>
      <SheetSceneCreate>
        <UiButton>
          {{ t('pages.scenes.actions.create') }}
        </UiButton>
      </SheetSceneCreate>
    </div>

    <UiTable>
      <UiTableHeader>
        <UiTableRow>
          <UiTableHead>{{ t('pages.scenes.table.name') }}</UiTableHead>
          <UiTableHead>{{ t('pages.scenes.table.size') }}</UiTableHead>
          <UiTableHead>{{ t('pages.scenes.table.targetFps') }}</UiTableHead>
          <UiTableHead>{{ t('pages.scenes.table.version') }}</UiTableHead>
          <UiTableHead />
        </UiTableRow>
      </UiTableHeader>
      <UiTableBody>
        <UiTableRow v-for="scene in scenes" :key="scene.id">
          <UiTableCell>{{ scene.name }}</UiTableCell>
          <UiTableCell>{{ scene.width }} x {{ scene.height }}</UiTableCell>
          <UiTableCell>{{ scene.targetFps }}</UiTableCell>
          <UiTableCell>{{ scene.version }}</UiTableCell>
          <UiTableCell class="text-right">
            <div class="flex justify-end gap-2">
              <SheetSceneEdit :scene="scene">
                <UiButton
                  variant="outline"
                  size="icon"
                  :aria-label="t('pages.scenes.actions.edit')"
                  class="cursor-pointer"
                >
                  <Pencil />
                </UiButton>
              </SheetSceneEdit>

              <DialogSceneDelete :scene="scene">
                <UiButton
                  variant="destructive"
                  size="icon"
                  :aria-label="t('pages.scenes.actions.delete')"
                  class="cursor-pointer"
                >
                  <Trash />
                </UiButton>
              </DialogSceneDelete>
            </div>
          </UiTableCell>
        </UiTableRow>
      </UiTableBody>
    </UiTable>
  </div>
</template>
