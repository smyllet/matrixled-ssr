<script lang="ts" setup>
const { t, locale, setLocale, locales } = useI18n()

const currentLocaleName = computed(
  () => locales.value.find((l) => l.code === locale.value)?.name || locale.value
)
</script>
<template>
  <UiDropdownMenu>
    <UiDropdownMenuTrigger>
      <UiButton variant="ghost" size="sm" class="flex items-center gap-2">
        <span class="text-lg">🌐</span>
        <span class="font-medium capitalize">{{ currentLocaleName }}</span>
      </UiButton>
    </UiDropdownMenuTrigger>
    <UiDropdownMenuContent>
      <UiDropdownMenuItem
        v-for="l in locales"
        :key="l.code"
        class="capitalize"
        @click="setLocale(l.code)"
      >
        {{ l.name ?? l.code }} {{ locale === l.code ? '✓' : '' }}
      </UiDropdownMenuItem>
    </UiDropdownMenuContent>
  </UiDropdownMenu>
</template>
