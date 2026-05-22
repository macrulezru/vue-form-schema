<script setup lang="ts">
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

function onChange(e: Event) {
  const target = e.target as HTMLSelectElement
  const selected = props.field.options?.find((o) => String(o.value) === target.value)
  emit('update:modelValue', selected?.value ?? target.value)
}
</script>

<template>
  <BaseField :field="field" :error="error" :touched="touched">
    <select
      :id="field.name"
      :name="field.name"
      :disabled="field.disabled === true"
      :required="field.required"
      class="vfs-select"
      @change="onChange"
      @blur="emit('blur')"
    >
      <option value="" disabled :selected="modelValue === null || modelValue === undefined || modelValue === ''">
        {{ field.placeholder ?? 'Select an option' }}
      </option>
      <option
        v-for="opt in field.options"
        :key="String(opt.value)"
        :value="String(opt.value)"
        :selected="modelValue === opt.value"
      >
        {{ opt.label }}
      </option>
    </select>
  </BaseField>
</template>
