<script setup lang="ts">
import InputNumber from 'primevue/inputnumber'
import BaseField from './BaseField.vue'
import type { FieldDefinition } from '../../core/types'

defineProps<{
  field: FieldDefinition
  modelValue: number | null
  error?: string[]
  touched?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number | null]
  blur: []
}>()
</script>

<template>
  <BaseField v-slot="aria" :field="field" :error="error" :touched="touched">
    <InputNumber
      :input-id="field.name"
      :name="field.name"
      :model-value="modelValue"
      :placeholder="field.placeholder"
      :disabled="field.disabled === true"
      fluid
      v-bind="aria"
      @update:model-value="(v: number | null) => emit('update:modelValue', v)"
      @blur="emit('blur')"
    />
  </BaseField>
</template>
