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
  <!-- Pass field without label so BaseField doesn't render a separate <label> above.
       The checkbox carries its own inline label text. -->
  <BaseField
    v-slot="aria"
    :field="{ ...field, label: undefined }"
    :error="error"
    :touched="touched"
  >
    <label class="vfs-checkbox-label">
      <input
        :id="field.name"
        type="checkbox"
        :name="field.name"
        :checked="!!modelValue"
        :disabled="field.disabled === true"
        :required="field.required"
        :aria-checked="modelValue ? 'true' : 'false'"
        v-bind="aria"
        class="vfs-checkbox"
        @change="emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
        @blur="emit('blur')"
      />
      <span v-if="field.label" class="vfs-checkbox-text">{{ field.label }}</span>
    </label>
  </BaseField>
</template>
