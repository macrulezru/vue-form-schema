<script setup lang="ts">
import Checkbox from 'primevue/checkbox'
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
      <Checkbox
        :input-id="field.name"
        :name="field.name"
        :model-value="!!modelValue"
        binary
        :disabled="field.disabled === true"
        v-bind="aria"
        @update:model-value="(v: boolean) => emit('update:modelValue', v)"
        @blur="emit('blur')"
      />
      <span v-if="field.label" class="text-sm">{{ field.label }}</span>
    </label>
  </BaseField>
</template>
