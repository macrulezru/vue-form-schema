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
      class="border-input focus-visible:ring-ring flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50"
      :class="hasError ? 'border-destructive focus-visible:ring-destructive' : ''"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      @blur="emit('blur')"
    />
  </BaseField>
</template>
