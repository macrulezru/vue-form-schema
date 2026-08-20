<script setup lang="ts">
import Textarea from 'primevue/textarea'
import BaseField from './BaseField.vue'
import type { FieldDefinition } from '../../core/types'

defineProps<{
  field: FieldDefinition
  modelValue: string | null
  error?: string[]
  touched?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  blur: []
}>()
</script>

<template>
  <BaseField v-slot="aria" :field="field" :error="error" :touched="touched">
    <Textarea
      :id="field.name"
      :name="field.name"
      :model-value="modelValue ?? ''"
      :placeholder="field.placeholder"
      :disabled="field.disabled === true"
      :required="field.required"
      rows="3"
      fluid
      v-bind="aria"
      @update:model-value="(v: string) => emit('update:modelValue', v)"
      @blur="emit('blur')"
    />
  </BaseField>
</template>
