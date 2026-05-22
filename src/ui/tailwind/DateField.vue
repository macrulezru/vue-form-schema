<script setup lang="ts">
import { computed } from 'vue'
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

const hasError = computed(() => !!(props.touched && props.error?.length))
</script>

<template>
  <BaseField v-slot="aria" :field="field" :error="error" :touched="touched">
    <input
      :id="field.name"
      type="date"
      :name="field.name"
      :value="modelValue ?? ''"
      :disabled="field.disabled === true"
      :required="field.required"
      v-bind="aria"
      class="w-full rounded-lg border bg-gray-900 px-3 py-2 text-sm text-gray-100 outline-none transition focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
      :class="hasError
        ? 'border-red-500 focus:ring-red-500'
        : 'border-gray-700 focus:ring-indigo-500 focus:border-indigo-500'"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      @blur="emit('blur')"
    />
  </BaseField>
</template>
