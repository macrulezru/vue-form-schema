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
      class="border-input placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[70px] w-full resize-y rounded-md border bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50"
      :class="hasError ? 'border-destructive focus-visible:ring-destructive' : ''"
      @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
      @blur="emit('blur')"
    />
  </BaseField>
</template>
