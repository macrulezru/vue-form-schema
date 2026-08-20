<script setup lang="ts">
import BaseField from './BaseField.vue'
import type { FieldDefinition } from '../../core/types'

defineProps<{
  field: FieldDefinition
  modelValue: boolean | null
  error?: string[]
  touched?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  blur: []
}>()
</script>

<template>
  <BaseField
    v-slot="aria"
    :field="{ ...field, label: undefined }"
    :error="error"
    :touched="touched"
  >
    <label class="flex cursor-pointer items-center gap-2.5">
      <input
        :id="field.name"
        type="checkbox"
        :name="field.name"
        :checked="!!modelValue"
        :disabled="field.disabled === true"
        :required="field.required"
        :aria-checked="modelValue ? 'true' : 'false'"
        v-bind="aria"
        class="border-primary text-primary focus-visible:ring-ring peer h-4 w-4 shrink-0 cursor-pointer rounded-sm border shadow focus-visible:outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50"
        @change="emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
        @blur="emit('blur')"
      />
      <span v-if="field.label" class="text-sm leading-none">{{ field.label }}</span>
    </label>
  </BaseField>
</template>
