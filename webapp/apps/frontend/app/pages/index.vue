<script setup lang="ts">
const { $api } = useNuxtApp()

const user = useAsyncData('user', async () => {
  const [data, error] = await $api.request('profile.profile.show', {}).safe()

  if (error) {
    return null
  }

  return data.data
})
</script>

<template>
  <p>
    {{ user.data?.value?.fullName ?? 'unknown' }}
  </p>
</template>
