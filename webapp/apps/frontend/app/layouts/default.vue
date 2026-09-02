<script setup lang="ts">
/**
 * This layout is exactly the "signed-in user" perimeter — `login.vue` and
 * `register.vue` use `empty` — so the dashboard channel opens here and closes
 * with it.
 */
useDashboardEvents()
</script>

<template>
  <UiSidebarProvider>
    <AppSidebar />
    <UiSidebarInset>
      <header
        class="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12"
      >
        <div class="flex items-center gap-2 px-4">
          <UiSidebarTrigger class="-ml-1" />
          <UiSeparator orientation="vertical" class="mr-2 data-[orientation=vertical]:h-4" />
          <AppBreadcrumb />
        </div>
      </header>
      <div class="flex flex-1 flex-col gap-4 p-4 pt-0">
        <AppConnectionLost />
        <slot />
      </div>
    </UiSidebarInset>
  </UiSidebarProvider>
</template>
