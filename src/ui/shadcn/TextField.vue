<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import BaseField from './BaseField.vue'
import type { FieldDefinition } from '../../core/types'
import { bindMask } from '../../core/MaskEngine'

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

const inputRef = ref<HTMLInputElement | null>(null)
let cleanupMask: (() => void) | null = null

const hasError = computed(() => !!(props.touched && props.error?.length))

onMounted(() => {
  if (inputRef.value && props.field.mask) {
    cleanupMask = bindMask(inputRef.value, props.field.mask)
  }
})
onUnmounted(() => cleanupMask?.())
</script>

<template>
  <BaseField v-slot="aria" :field="field" :error="error" :touched="touched">
    <input
      :id="field.name"
      ref="inputRef"
      :type="field.type === 'email' ? 'email' : 'text'"
      :name="field.name"
      :value="modelValue ?? ''"
      :placeholder="field.placeholder"
      :disabled="field.disabled === true"
      :required="field.required"
      v-bind="aria"
      class="border-input placeholder:text-muted-foreground focus-visible:ring-ring flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50"
      :class="hasError ? 'border-destructive focus-visible:ring-destructive' : ''"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      @blur="emit('blur')"
    />
  </BaseField>
</template>
