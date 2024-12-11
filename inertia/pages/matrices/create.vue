<script lang="ts" setup>
import { Head, useForm } from '@inertiajs/vue3'
import Button from 'primevue/button'
import FloatLabel from 'primevue/floatlabel'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import ErrorAndNotificationDisplay from '~/components/ErrorAndNotificationDisplay.vue'

const form = useForm({
  name: '',
  width: 0,
  height: 0,
})

function submit() {
  form.clearErrors()
  form.post('/matrices')
}
</script>

<template>
  <Head title="Create Matrix" />

  <form @submit.prevent="submit">
    <div class="px-6 py-20 md:px-12 lg:px-20 h-screen">
      <div class="rounded-border max-w-xl mx-auto flex flex-col gap-8">
        <div class="text-center">
          <div class="text-3xl font-medium">Create Matrix</div>
        </div>

        <ErrorAndNotificationDisplay />

        <div class="flex flex-col gap-8">
          <FloatLabel>
            <InputText
              id="name"
              type="text"
              name="name"
              class="w-full"
              autocomplete="off"
              :invalid="!!form.errors.name"
              v-model="form.name"
            />
            <label for="name">Name</label>
            <Message
              v-for="error in form.errors.name ?? []"
              severity="error"
              variant="simple"
              size="small"
              class="pt-1"
            >
              {{ error }}
            </Message>
          </FloatLabel>

          <div class="grid grid-cols-2 gap-4">
            <FloatLabel>
              <InputNumber
                id="width"
                name="width"
                class="w-full"
                suffix=" px"
                mode="decimal"
                show-buttons
                autocomplete="off"
                :min="8"
                :max="512"
                :invalid="!!form.errors.width"
                v-model="form.width"
              />
              <label for="width">Width</label>
              <Message
                v-for="error in form.errors.width ?? []"
                severity="error"
                variant="simple"
                size="small"
                class="pt-1"
              >
                {{ error }}
              </Message>
            </FloatLabel>

            <FloatLabel>
              <InputNumber
                id="height"
                name="height"
                class="w-full"
                suffix=" px"
                mode="decimal"
                show-buttons
                autocomplete="off"
                :min="8"
                :max="512"
                :invalid="!!form.errors.height"
                v-model="form.height"
              />
              <label for="height">Height</label>
              <Message
                v-for="error in form.errors.height ?? []"
                severity="error"
                variant="simple"
                size="small"
                class="pt-1"
              >
                {{ error }}
              </Message>
            </FloatLabel>
          </div>
        </div>

        <div class="text-center flex flex-col gap-4">
          <Button
            label="Create"
            icon="pi pi-plus"
            class="w-full"
            type="submit"
            :loading="form.processing"
          />
        </div>
      </div>
    </div>
  </form>
</template>
