<script setup lang="ts">
import type { FieldDefinition } from '../../core/types'

const props = defineProps<{
  field: FieldDefinition
  error?: string[]
  touched?: boolean
}>()
</script>

<template>
  <div class="vfs-field" :class="[`vfs-field--${props.field.type}`, { 'vfs-field--error': touched && error?.length }]">
    <label v-if="props.field.label" :for="props.field.name" class="vfs-field__label">
      {{ props.field.label }}
      <span v-if="props.field.required" class="vfs-field__required" aria-hidden="true">*</span>
    </label>
    <slot />
    <ul v-if="touched && error?.length" class="vfs-field__errors" role="alert">
      <li v-for="(msg, i) in error" :key="i" class="vfs-field__error">{{ msg }}</li>
    </ul>
  </div>
</template>
