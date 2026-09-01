<script setup lang="ts">
import { KeyRound, Trash } from 'lucide-vue-next'

definePageMeta({
  breadcrumb: [{ label: 'nav.platform' }, { label: 'nav.renderers', to: '/renderers' }],
})

const { t } = useI18n()
const { $api, hook } = useNuxtApp()

const {
  data: renderers,
  pending,
  refresh,
} = useAsyncData('renderers', async () => {
  const [data, error] = await $api.request('renderers.index', {}).safe()

  if (error) {
    return []
  }

  return data.data
})

hook('app:renderer:created', async () => {
  await refresh()
})
hook('app:renderer:updated', async () => {
  await refresh()
})
hook('app:renderer:deleted', async () => {
  await refresh()
})

/**
 * A renderer without an owner is the platform one: shared by every user, and
 * administered from the console rather than from here.
 */
function isPlatformRenderer(renderer: { ownerId: string | null }) {
  return renderer.ownerId === null
}

function formatLastSeenAt(lastSeenAt: unknown) {
  if (!lastSeenAt) return t('pages.renderers.never')

  const date = new Date(String(lastSeenAt))

  return Number.isNaN(date.getTime()) ? t('pages.renderers.never') : date.toLocaleString()
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <h2 class="text-2xl font-semibold tracking-tight">
          {{ t('pages.renderers.title') }}
        </h2>
        <UiSpinner v-if="pending" />
        <span v-else class="text-md text-gray-500">({{ renderers?.length ?? 0 }})</span>
      </div>
      <SheetRendererCreate>
        <UiButton>
          {{ t('pages.renderers.actions.create') }}
        </UiButton>
      </SheetRendererCreate>
    </div>

    <UiTable>
      <UiTableHeader>
        <UiTableRow>
          <UiTableHead>{{ t('pages.renderers.table.name') }}</UiTableHead>
          <UiTableHead>{{ t('pages.renderers.table.kind') }}</UiTableHead>
          <UiTableHead>{{ t('pages.renderers.table.status') }}</UiTableHead>
          <UiTableHead>{{ t('pages.renderers.table.tokenPrefix') }}</UiTableHead>
          <UiTableHead>{{ t('pages.renderers.table.lastSeenAt') }}</UiTableHead>
          <UiTableHead />
        </UiTableRow>
      </UiTableHeader>
      <UiTableBody>
        <UiTableRow v-for="renderer in renderers" :key="renderer.id">
          <UiTableCell>{{ renderer.name }}</UiTableCell>
          <UiTableCell>
            {{
              isPlatformRenderer(renderer)
                ? t('pages.renderers.kind.platform')
                : t('pages.renderers.kind.own')
            }}
          </UiTableCell>
          <UiTableCell>{{ t(`pages.renderers.status.${renderer.status}`) }}</UiTableCell>
          <UiTableCell class="font-mono text-xs">{{ renderer.tokenPrefix }}</UiTableCell>
          <UiTableCell>{{ formatLastSeenAt(renderer.lastSeenAt) }}</UiTableCell>
          <UiTableCell class="text-right">
            <div v-if="!isPlatformRenderer(renderer)" class="flex justify-end gap-2">
              <DialogRendererRotateToken :renderer="renderer">
                <UiButton
                  variant="outline"
                  size="icon"
                  :aria-label="t('pages.renderers.actions.rotateToken')"
                  class="cursor-pointer"
                >
                  <KeyRound />
                </UiButton>
              </DialogRendererRotateToken>

              <DialogRendererDelete :renderer="renderer">
                <UiButton
                  variant="destructive"
                  size="icon"
                  :aria-label="t('pages.renderers.actions.delete')"
                  class="cursor-pointer"
                >
                  <Trash />
                </UiButton>
              </DialogRendererDelete>
            </div>
          </UiTableCell>
        </UiTableRow>
      </UiTableBody>
    </UiTable>
  </div>
</template>
