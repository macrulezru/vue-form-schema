<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import BaseField from './BaseField.vue'
import type { FieldDefinition } from '../../core/types'
import { bindMask } from '../../core/MaskEngine'

const props = defineProps<{
  field: FieldDefinition
  modelValue: string
  error?: string[]
  touched?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  blur: []
}>()

const inputRef = ref<HTMLInputElement | null>(null)
let cleanupMask: (() => void) | null = null

onMounted(() => {
  if (inputRef.value && props.field.mask) {
    cleanupMask = bindMask(inputRef.value, props.field.mask)
  }
})

onUnmounted(() => cleanupMask?.())

function onInput(e: Event) {
  emit('update:modelValue', (e.target as HTMLInputElement).value)
}
</script>

<template>
  <BaseField :field="field" :error="error" :touched="touched">
    <input
      :id="field.name"
      ref="inputRef"
      :type="field.type === 'email' ? 'email' : 'text'"
      :name="field.name"
      :value="modelValue"
      :placeholder="field.placeholder"
      :disabled="field.disabled === true"
      :required="field.required"
      class="vfs-input"
      @input="onInput"
      @blur="emit('blur')"
    />
  </BaseField>
</template>
