<script setup lang="ts">
const { $api } = useNuxtApp()

const { data: user } = await useAsyncData('user', async () => {
  const response = await $api.api.profile.profile.show({})
  return response.data
})

$api.api.auth.newAccount.store({
  body: {
    email: '',
    password: '',
    passwordConfirmation: '',
    fullName: '',
  },
})
$api.request('profile.profile.show', {})
</script>

<template>
  <div>
    <div v-if="user">
      {{ user.fullName }}
    </div>
  </div>
</template>
