<script setup lang="ts">
import { NCheckbox, NFormItem } from 'naive-ui'
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
  <NFormItem :show-label="false" :show-feedback="touched && !!error?.length">
    <template v-if="touched && error?.length" #feedback>
      <div v-for="(msg, i) in error" :key="i">{{ msg }}</div>
    </template>
    <!-- NCheckbox has no id/name prop (or an inputProps escape hatch) to
         forward onto its internal input — it manages checked state itself
         and isn't meant to participate in native form submission. -->
    <NCheckbox
      :checked="!!modelValue"
      :disabled="field.disabled === true"
      @update:checked="(v: boolean) => emit('update:modelValue', v)"
      @blur="emit('blur')"
    >
      {{ field.label }}
    </NCheckbox>
  </NFormItem>
</template>
