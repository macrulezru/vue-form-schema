<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { NFormItem, NInput } from 'naive-ui'
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

const inputRef = ref<InstanceType<typeof NInput> | null>(null)
let cleanupMask: (() => void) | null = null

const hasError = computed(() => !!(props.touched && props.error?.length))

onMounted(() => {
  const el = (inputRef.value as unknown as { inputElRef?: HTMLInputElement })?.inputElRef
  if (el && props.field.mask) {
    cleanupMask = bindMask(el, props.field.mask)
  }
})
onUnmounted(() => cleanupMask?.())
</script>

<template>
  <NFormItem
    :label="field.label"
    :required="field.required"
    :validation-status="hasError ? 'error' : undefined"
    :show-feedback="hasError"
  >
    <template v-if="hasError" #feedback>
      <div v-for="(msg, i) in error" :key="i">{{ msg }}</div>
    </template>
    <!-- NInput only supports type 'text' | 'textarea' | 'password' — email
         fields still get client-side validation from the schema's built-in
         `email` validator, just not the native browser input type.
         id/name aren't top-level props on NInput (it forwards them to the
         wrapper, not the inner <input>) — inputProps is the actual escape
         hatch to the real DOM element. -->
    <NInput
      ref="inputRef"
      type="text"
      :input-props="{ id: field.name, name: field.name }"
      :value="modelValue ?? ''"
      :placeholder="field.placeholder"
      :disabled="field.disabled === true"
      :status="hasError ? 'error' : undefined"
      @update:value="(v: string) => emit('update:modelValue', v)"
      @blur="emit('blur')"
    />
  </NFormItem>
</template>
