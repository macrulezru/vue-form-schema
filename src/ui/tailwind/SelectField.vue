<script setup lang="ts">
import { computed } from 'vue'
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

const options = computed(() =>
  Array.isArray(props.field.options) ? props.field.options : [],
)
const hasError = computed(() => !!(props.touched && props.error?.length))

function onChange(e: Event) {
  const target = e.target as HTMLSelectElement
  const selected = options.value.find((o) => String(o.value) === target.value)
  emit('update:modelValue', selected?.value ?? target.value)
}
</script>

<template>
  <BaseField v-slot="aria" :field="field" :error="error" :touched="touched">
    <div v-if="field.optionsLoading" class="py-2 text-sm text-gray-400">Loading…</div>
    <select
      v-else
      :id="field.name"
      :name="field.name"
      :disabled="field.disabled === true || field.optionsLoading"
      :required="field.required"
      v-bind="aria"
      class="w-full rounded-lg border bg-gray-900 px-3 py-2 text-sm text-gray-100 outline-none transition focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
      :class="hasError
        ? 'border-red-500 focus:ring-red-500'
        : 'border-gray-700 focus:ring-indigo-500 focus:border-indigo-500'"
      @change="onChange"
      @blur="emit('blur')"
    >
      <option
        value=""
        disabled
        :selected="modelValue === null || modelValue === undefined || modelValue === ''"
        class="bg-gray-800"
      >
        {{ field.placeholder ?? 'Select an option' }}
      </option>
      <option
        v-for="opt in options"
        :key="String(opt.value)"
        :value="String(opt.value)"
        :selected="modelValue === opt.value"
        class="bg-gray-800"
      >
        {{ opt.label }}
      </option>
    </select>
  </BaseField>
</template>
