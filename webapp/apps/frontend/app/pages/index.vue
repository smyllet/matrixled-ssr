<script setup lang="ts">
const { $api } = useNuxtApp()

const { data: user } = await useAsyncData('user', async () => {
  const response = await $api.api.profile.profile.show({})
  return response.data
})


</script>

<template>
  <UiButton>
    HelloWorld
  </UiButton>
  <div>
    <div v-if="user">
      {{ user.fullName }}
    </div>
  </div>
</template>
