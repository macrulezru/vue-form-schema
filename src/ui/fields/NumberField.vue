<script setup lang="ts">
import BaseField from './BaseField.vue'
import type { FieldDefinition } from '../../core/types'

const props = defineProps<{
  field: FieldDefinition
  modelValue: number | null
  error?: string[]
  touched?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number | null]
  blur: []
}>()

function onInput(e: Event) {
  const raw = (e.target as HTMLInputElement).value
  emit('update:modelValue', raw === '' ? null : Number(raw))
}
</script>

<template>
  <BaseField v-slot="aria" :field="field" :error="error" :touched="touched">
    <input
      :id="field.name"
      type="number"
      :name="field.name"
      :value="modelValue ?? ''"
      :placeholder="field.placeholder"
      :disabled="field.disabled === true"
      :required="field.required"
      v-bind="aria"
      class="vfs-input"
      @input="onInput"
      @blur="emit('blur')"
    />
  </BaseField>
</template>
