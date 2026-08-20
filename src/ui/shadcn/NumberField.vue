<script setup lang="ts">
import { computed } from 'vue'
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

const hasError = computed(() => !!(props.touched && props.error?.length))

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
      class="border-input placeholder:text-muted-foreground focus-visible:ring-ring flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50"
      :class="hasError ? 'border-destructive focus-visible:ring-destructive' : ''"
      @input="onInput"
      @blur="emit('blur')"
    />
  </BaseField>
</template>
