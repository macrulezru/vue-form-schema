<script setup lang="ts">
import { computed } from 'vue'
import Message from 'primevue/message'
import type { FieldDefinition } from '../../core/types'

const props = defineProps<{
  field: FieldDefinition
  error?: string[]
  touched?: boolean
}>()

const hasError = computed(() => !!(props.touched && props.error?.length))
const errorId = computed(() => `${props.field.name}-error`)

const inputAttrs = computed(() => ({
  invalid: hasError.value,
  'aria-required': props.field.required ? ('true' as const) : undefined,
  'aria-invalid': (hasError.value ? 'true' : 'false') as 'true' | 'false',
  'aria-describedby': hasError.value ? errorId.value : undefined,
}))
</script>

<template>
  <div class="mb-4 flex flex-col gap-1.5">
    <label v-if="field.label" :for="field.name" class="text-sm font-medium">
      {{ field.label }}
      <span v-if="field.required" class="ml-0.5 text-red-500" aria-hidden="true">*</span>
    </label>
    <slot v-bind="inputAttrs" />
    <div v-if="hasError" :id="errorId" role="alert" aria-live="polite" class="flex flex-col gap-1">
      <Message v-for="(msg, i) in error" :key="i" severity="error" size="small" variant="simple">
        {{ msg }}
      </Message>
    </div>
  </div>
</template>
