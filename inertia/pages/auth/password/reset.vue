<script setup lang="ts">
import { Head, useForm } from '@inertiajs/vue3'
import Button from 'primevue/button'
import FloatLabel from 'primevue/floatlabel'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import ErrorAndNotificationDisplay from '~/components/ErrorAndNotificationDisplay.vue'
import Link from '~/components/ui/link.vue'

const props = defineProps<{
  token: string
}>()

const form = useForm({
  token: props.token,
  password: '',
})

function submit() {
  form.clearErrors()
  form.post('/auth/password/reset')
}
</script>

<template>
  <Head title="Reset Password" />

  <form @submit.prevent="submit">
    <div class="bg-neutral-50 dark:bg-neutral-950 px-6 py-20 md:px-12 lg:px-20 h-screen">
      <div
        class="bg-surface-0 dark:bg-surface-900 p-6 shadow rounded-border max-w-xl mx-auto flex flex-col gap-8"
      >
        <div class="text-center">
          <div class="text-3xl font-medium">Reset Password</div>
        </div>

        <ErrorAndNotificationDisplay />
        <Message severity="error" v-if="form.errors.token" v-for="error of form.errors.token">
          {{ error }}
        </Message>

        <div class="flex flex-col gap-8">
          <FloatLabel>
            <InputText
              id="password"
              type="password"
              name="password"
              class="w-full"
              autocomplete="new-password"
              :invalid="!!form.errors.password"
              v-model="form.password"
            />
            <label for="password">New password</label>
            <Message
              v-for="error in form.errors.password ?? []"
              severity="error"
              variant="simple"
              size="small"
              class="pt-1"
            >
              {{ error }}
            </Message>
          </FloatLabel>
        </div>

        <div class="text-center flex flex-col gap-4">
          <Button
            label="Reset Password"
            icon="pi pi-envelope"
            class="w-full"
            type="submit"
            :loading="form.processing"
          />

          <span class="text-surface-600 dark:text-surface-200 font-medium leading-normal">
            Return to
            <Link href="/auth/login">Login</Link>
          </span>
        </div>
      </div>
    </div>
  </form>
</template>
