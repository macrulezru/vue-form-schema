<script setup lang="ts">
import { computed } from 'vue'
import DatePicker from 'primevue/datepicker'
import BaseField from './BaseField.vue'
import type { FieldDefinition } from '../../core/types'

const props = defineProps<{
  field: FieldDefinition
  modelValue: string | null
  error?: string[]
  touched?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  blur: []
}>()

// PrimeVue's DatePicker binds a Date object; the rest of the library treats
// date fields as an ISO 'YYYY-MM-DD' string (same as a native <input type="date">).
function parseIsoDate(value: string | null): Date | null {
  if (!value) return null
  const [y, m, d] = value.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

// DatePicker's emit type covers range/multi-date selection modes too; this
// field only ever uses the default single-date mode, so anything else is
// defensively treated as "no value".
function toIsoDate(date: Date | Date[] | (Date | null)[] | null | undefined): string {
  if (!(date instanceof Date)) return ''
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const dateValue = computed(() => parseIsoDate(props.modelValue))
</script>

<template>
  <BaseField v-slot="aria" :field="field" :error="error" :touched="touched">
    <DatePicker
      :input-id="field.name"
      :name="field.name"
      :model-value="dateValue"
      date-format="yy-mm-dd"
      show-icon
      icon-display="input"
      :disabled="field.disabled === true"
      fluid
      v-bind="aria"
      @update:model-value="
        (v: Date | Date[] | (Date | null)[] | null | undefined) =>
          emit('update:modelValue', toIsoDate(v))
      "
      @blur="emit('blur')"
    />
  </BaseField>
</template>
