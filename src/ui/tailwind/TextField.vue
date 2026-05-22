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
      class="w-full rounded-lg border bg-gray-900 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 outline-none transition focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
      :class="hasError
        ? 'border-red-500 focus:ring-red-500'
        : 'border-gray-700 focus:ring-indigo-500 focus:border-indigo-500'"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      @blur="emit('blur')"
    />
  </BaseField>
</template>
