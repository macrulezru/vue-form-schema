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
    <textarea
      :id="field.name"
      :name="field.name"
      :value="modelValue ?? ''"
      :placeholder="field.placeholder"
      :disabled="field.disabled === true"
      :required="field.required"
      v-bind="aria"
      class="w-full resize-y rounded-lg border bg-gray-900 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 outline-none transition focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
      :class="hasError
        ? 'border-red-500 focus:ring-red-500'
        : 'border-gray-700 focus:ring-indigo-500 focus:border-indigo-500'"
      style="min-height:80px"
      @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
      @blur="emit('blur')"
    />
  </BaseField>
</template>
