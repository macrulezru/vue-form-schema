<script setup lang="ts">
import { computed } from 'vue'
import Select from 'primevue/select'
import BaseField from './BaseField.vue'
import type { FieldDefinition } from '../../core/types'

const props = defineProps<{
  field: FieldDefinition
  modelValue: unknown
  error?: string[]
  touched?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: unknown]
  blur: []
}>()

const options = computed(() => (Array.isArray(props.field.options) ? props.field.options : []))
</script>

<template>
  <BaseField v-slot="aria" :field="field" :error="error" :touched="touched">
    <Select
      :input-id="field.name"
      :name="field.name"
      :model-value="modelValue"
      :options="options"
      option-label="label"
      option-value="value"
      :placeholder="field.placeholder ?? 'Select an option'"
      :disabled="field.disabled === true || field.optionsLoading"
      :loading="field.optionsLoading"
      fluid
      v-bind="aria"
      @update:model-value="(v: unknown) => emit('update:modelValue', v)"
      @blur="emit('blur')"
    />
  </BaseField>
</template>
