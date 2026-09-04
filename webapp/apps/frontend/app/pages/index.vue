<script setup lang="ts">
import { Pencil, Trash } from 'lucide-vue-next'

definePageMeta({
  breadcrumb: [{ label: 'nav.platform' }, { label: 'nav.devices', to: '/' }],
})

const { t } = useI18n()
const { $api } = useNuxtApp()

const { data: devices, pending } = useAsyncData('devices', async () => {
  const [data, error] = await $api.request('devices.index', {}).safe()

  if (error) {
    return []
  }

  return data.data
})

/**
 * Scenes and renderers are read under the very keys their own pages use, so
 * the SSE channel refreshes them here too: a scene renamed in another tab
 * shows up in this table and in the edit sheet without a reload.
 */
const { data: scenes } = useAsyncData('scenes', async () => {
  const [data, error] = await $api.request('scenes.index', {}).safe()

  if (error) {
    return []
  }

  return data.data
})

const { data: renderers } = useAsyncData('renderers', async () => {
  const [data, error] = await $api.request('renderers.index', {}).safe()

  if (error) {
    return []
  }

  return data.data
})

function sceneName(sceneId: string | null) {
  if (!sceneId) return t('pages.devices.noScene')

  return scenes.value?.find((scene) => scene.id === sceneId)?.name ?? t('pages.devices.noScene')
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <h2 class="text-2xl font-semibold tracking-tight">
          {{ t('pages.devices.title') }}
        </h2>
        <UiSpinner v-if="pending" />
        <span v-else class="text-md text-gray-500">({{ devices?.length ?? 0 }})</span>
      </div>
      <SheetDeviceCreate>
        <UiButton>
          {{ t('pages.devices.actions.create') }}
        </UiButton>
      </SheetDeviceCreate>
    </div>

    <UiTable>
      <UiTableHeader>
        <UiTableRow>
          <UiTableHead>{{ t('pages.devices.table.name') }}</UiTableHead>
          <UiTableHead>{{ t('pages.devices.table.size') }}</UiTableHead>
          <UiTableHead>{{ t('pages.devices.table.kind') }}</UiTableHead>
          <UiTableHead>{{ t('pages.devices.table.status') }}</UiTableHead>
          <UiTableHead>{{ t('pages.devices.table.scene') }}</UiTableHead>
          <UiTableHead />
        </UiTableRow>
      </UiTableHeader>
      <UiTableBody>
        <UiTableRow v-for="device in devices" :key="device.id">
          <UiTableCell>{{ device.name }}</UiTableCell>
          <UiTableCell>{{ device.width }} x {{ device.height }}</UiTableCell>
          <UiTableCell>{{ t(`pages.devices.kind.${device.kind}`) }}</UiTableCell>
          <UiTableCell>{{ t(`pages.devices.status.${device.status}`) }}</UiTableCell>
          <UiTableCell>{{ sceneName(device.sceneId) }}</UiTableCell>
          <UiTableCell class="text-right">
            <div class="flex justify-end gap-2">
              <SheetDeviceEdit :device="device" :scenes="scenes ?? []" :renderers="renderers ?? []">
                <UiButton
                  variant="outline"
                  size="icon"
                  :aria-label="t('pages.devices.actions.edit')"
                  class="cursor-pointer"
                >
                  <Pencil />
                </UiButton>
              </SheetDeviceEdit>

              <DialogDeviceDelete :device="device">
                <UiButton
                  variant="destructive"
                  size="icon"
                  :aria-label="t('pages.devices.actions.delete')"
                  class="cursor-pointer"
                >
                  <Trash />
                </UiButton>
              </DialogDeviceDelete>
            </div>
          </UiTableCell>
        </UiTableRow>
      </UiTableBody>
    </UiTable>
  </div>
</template>
