<script setup lang="ts">
import { Link } from '@inertiajs/vue3'
</script>

<template>
  <Link
    class="text-primary cursor-pointer rounded-sm outline-primary outline-offset-1 outline-1 hover:text-primary-emphasis active:text-primary-emphasis-alt focus-visible:outline"
    v-bind="$attrs"
  >
    <slot />
  </Link>
</template>
