<script setup lang="ts">
import type { SidebarProps } from '@/components/ui/sidebar'

import { Grid2x2, Layers, Server, Tv2 } from 'lucide-vue-next'

const props = withDefaults(defineProps<SidebarProps>(), {
  collapsible: 'icon',
})

const { t } = useI18n()
const { $api } = useNuxtApp()

const { data: user } = useAsyncData('user', async () => {
  const [data, error] = await $api.request('profile.profile.show', {}).safe()

  if (error) {
    return undefined
  }

  return data.data
})

const data = computed(() => ({
  user: user.value,
  navMain: [
    {
      title: t('nav.matrices'),
      url: '/',
      icon: Grid2x2,
    },
    {
      title: t('nav.scenes'),
      url: '/scenes',
      icon: Layers,
    },
    {
      title: t('nav.renderers'),
      url: '/renderers',
      icon: Server,
    },
  ],
}))
</script>

<template>
  <UiSidebar v-bind="props">
    <UiSidebarHeader>
      <UiSidebarMenu>
        <UiSidebarMenuItem>
          <UiSidebarMenuButton size="lg" as-child>
            <NuxtLink to="/">
              <div
                class="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground"
              >
                <Tv2 class="size-4" />
              </div>
              <div class="flex flex-col gap-0.5 leading-none">
                <span class="font-medium">
                  {{ $t('app.name') }}
                </span>
                <span class="">
                  {{ $t('app.tagline') }}
                </span>
              </div>
            </NuxtLink>
          </UiSidebarMenuButton>
        </UiSidebarMenuItem>
      </UiSidebarMenu>
    </UiSidebarHeader>
    <UiSidebarContent>
      <NavMain :items="data.navMain" />
    </UiSidebarContent>
    <UiSidebarFooter>
      <NavUser :user="data.user" />
    </UiSidebarFooter>
    <UiSidebarRail />
  </UiSidebar>
</template>
