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

/** Bind these onto your <input> / <select> / <textarea> for full a11y support */
const inputAttrs = computed(() => ({
  'aria-required': props.field.required ? ('true' as const) : undefined,
  'aria-invalid': (hasError.value ? 'true' : 'false') as 'true' | 'false',
  'aria-describedby': hasError.value ? errorId.value : undefined,
}))
</script>

<template>
  <div class="vfs-field" :class="[`vfs-field--${props.field.type}`, { 'vfs-field--error': hasError }]">
    <label v-if="props.field.label" :for="props.field.name" class="vfs-field__label">
      {{ props.field.label }}
      <span v-if="props.field.required" class="vfs-field__required" aria-hidden="true">*</span>
    </label>
    <slot v-bind="inputAttrs" />
    <ul
      v-if="hasError"
      :id="errorId"
      class="vfs-field__errors"
      role="alert"
      aria-live="polite"
    >
      <li v-for="(msg, i) in error" :key="i" class="vfs-field__error">{{ msg }}</li>
    </ul>
  </div>
</template>
