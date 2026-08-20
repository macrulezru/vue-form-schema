<script setup lang="ts">
import { computed } from 'vue'
import { NDatePicker, NFormItem } from 'naive-ui'
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
  <NFormItem
    :label="field.label"
    :required="field.required"
    :validation-status="hasError ? 'error' : undefined"
    :show-feedback="hasError"
  >
    <template v-if="hasError" #feedback>
      <div v-for="(msg, i) in error" :key="i">{{ msg }}</div>
    </template>
    <NDatePicker
      type="date"
      value-format="yyyy-MM-dd"
      style="width: 100%"
      :formatted-value="modelValue"
      :disabled="field.disabled === true"
      :status="hasError ? 'error' : undefined"
      @update:formatted-value="(v: string | null) => emit('update:modelValue', v ?? '')"
      @blur="emit('blur')"
    />
  </NFormItem>
</template>
