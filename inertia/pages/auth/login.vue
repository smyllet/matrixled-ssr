<script setup lang="ts">
import { Head, useForm } from '@inertiajs/vue3'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import FloatLabel from 'primevue/floatlabel'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Link from '~/components/ui/link.vue'
import { usePageErrorsBag } from '~/composables/use_page_errors_bag'

const errorsBag = usePageErrorsBag()

const form = useForm({
  email: '',
  password: '',
  rememberMe: false,
})

function submit() {
  form.clearErrors()
  form.post('/auth/login', {
    onSuccess: () => {
      console.log('success')
    },
    onError: (err) => {
      console.log('error form', err)
    },
  })
}
</script>

<template>
  <Head title="Login" />

  <form @submit.prevent="submit">
    <div class="bg-neutral-50 dark:bg-neutral-950 px-6 py-20 md:px-12 lg:px-20 h-screen">
      <div
        class="bg-surface-0 dark:bg-surface-900 p-6 shadow rounded-border max-w-xl mx-auto flex flex-col gap-8"
      >
        <div class="text-center">
          <div class="text-3xl font-medium">Login</div>
        </div>

        <Message severity="error" v-if="errorsBag?.E_INVALID_CREDENTIALS">{{
          errorsBag.E_INVALID_CREDENTIALS
        }}</Message>

        <div class="flex flex-col gap-8">
          <FloatLabel>
            <InputText
              id="email"
              type="email"
              name="email"
              class="w-full"
              :invalid="!!form.errors.email"
              v-model="form.email"
            />
            <label for="email">Email</label>
            <Message
              v-for="error in form.errors.email ?? []"
              severity="error"
              variant="simple"
              size="small"
              class="pt-1"
            >
              {{ error }}
            </Message>
          </FloatLabel>

          <FloatLabel>
            <InputText
              id="password"
              type="password"
              name="password"
              class="w-full"
              :invalid="!!form.errors.password"
              autocomplete="current-password"
              v-model="form.password"
            />
            <label for="password">Password</label>
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

          <div class="flex items-center gap-2">
            <Checkbox id="rememberme1" v-model="form.rememberMe" :binary="true" />
            <label for="rememberme1">Remember me</label>
          </div>
        </div>

        <div class="text-center flex flex-col gap-4">
          <Button
            label="Login"
            icon="pi pi-user"
            class="w-full"
            type="submit"
            :loading="form.processing"
          />

          <span class="text-surface-600 dark:text-surface-200 font-medium leading-normal">
            Don't have an account?
            <Link href="/auth/register">Register</Link>
          </span>
        </div>
      </div>
    </div>
  </form>
</template>
