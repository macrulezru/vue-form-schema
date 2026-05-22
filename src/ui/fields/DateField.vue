<script setup lang="ts">
import BaseField from './BaseField.vue'
import type { FieldDefinition } from '../../core/types'

const props = defineProps<{
  field: FieldDefinition
  modelValue: string
  error?: string[]
  touched?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  blur: []
}>()
</script>

<template>
  <BaseField :field="field" :error="error" :touched="touched">
    <input
      :id="field.name"
      type="date"
      :name="field.name"
      :value="modelValue"
      :disabled="field.disabled === true"
      :required="field.required"
      class="vfs-input"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      @blur="emit('blur')"
    />
  </BaseField>
</template>
