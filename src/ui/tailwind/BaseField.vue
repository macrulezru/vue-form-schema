<script setup lang="ts">
import { computed } from 'vue'
import type { FieldDefinition } from '../../core/types'

const props = defineProps<{
  field: FieldDefinition
  error?: string[]
  touched?: boolean
}>()

const hasError = computed(() => !!(props.touched && props.error?.length))
const errorId = computed(() => `${props.field.name}-error`)

const inputAttrs = computed(() => ({
  'aria-required': props.field.required ? ('true' as const) : undefined,
  'aria-invalid': (hasError.value ? 'true' : 'false') as 'true' | 'false',
  'aria-describedby': hasError.value ? errorId.value : undefined,
}))
</script>

<template>
  <div class="mb-4">
    <label
      v-if="field.label"
      :for="field.name"
      class="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5"
    >
      {{ field.label }}
      <span v-if="field.required" class="text-red-400 ml-0.5" aria-hidden="true">*</span>
    </label>
    <slot v-bind="inputAttrs" />
    <ul
      v-if="hasError"
      :id="errorId"
      class="mt-1 space-y-0.5"
      role="alert"
      aria-live="polite"
    >
      <li v-for="(msg, i) in error" :key="i" class="text-red-400 text-xs">{{ msg }}</li>
    </ul>
  </div>
</template>
