<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import InputText from 'primevue/inputtext'
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

const inputRef = ref<InstanceType<typeof InputText> | null>(null)
let cleanupMask: (() => void) | null = null

onMounted(() => {
  // PrimeVue components expose the native element via `$el`
  const el = (inputRef.value as unknown as { $el?: HTMLInputElement })?.$el
  if (el && props.field.mask) {
    cleanupMask = bindMask(el, props.field.mask)
  }
})
onUnmounted(() => cleanupMask?.())
</script>

<template>
  <BaseField v-slot="aria" :field="field" :error="error" :touched="touched">
    <InputText
      :id="field.name"
      ref="inputRef"
      :type="field.type === 'email' ? 'email' : 'text'"
      :name="field.name"
      :model-value="modelValue ?? ''"
      :placeholder="field.placeholder"
      :disabled="field.disabled === true"
      :required="field.required"
      fluid
      v-bind="aria"
      @update:model-value="(v: string | undefined) => emit('update:modelValue', v ?? '')"
      @blur="emit('blur')"
    />
  </BaseField>
</template>
