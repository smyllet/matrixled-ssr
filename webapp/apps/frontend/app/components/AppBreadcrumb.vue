<script setup lang="ts">
const route = useRoute()
const { t } = useI18n()

const entries = computed(() => route.meta.breadcrumb ?? [])
</script>

<template>
  <UiBreadcrumb v-if="entries.length">
    <UiBreadcrumbList>
      <template v-for="(entry, index) in entries" :key="entry.label">
        <UiBreadcrumbItem :class="index < entries.length - 1 ? 'hidden md:block' : undefined">
          <UiBreadcrumbPage v-if="index === entries.length - 1">
            {{ t(entry.label) }}
          </UiBreadcrumbPage>
          <UiBreadcrumbLink v-else-if="entry.to" as-child>
            <NuxtLink :to="entry.to">{{ t(entry.label) }}</NuxtLink>
          </UiBreadcrumbLink>
          <span v-else>{{ t(entry.label) }}</span>
        </UiBreadcrumbItem>
        <UiBreadcrumbSeparator v-if="index < entries.length - 1" class="hidden md:block" />
      </template>
    </UiBreadcrumbList>
  </UiBreadcrumb>
</template>
