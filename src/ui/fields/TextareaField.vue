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
    <textarea
      :id="field.name"
      :name="field.name"
      :value="modelValue"
      :placeholder="field.placeholder"
      :disabled="field.disabled === true"
      :required="field.required"
      class="vfs-textarea"
      @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
      @blur="emit('blur')"
    />
  </BaseField>
</template>
