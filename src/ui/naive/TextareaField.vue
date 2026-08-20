<script setup lang="ts">
import { computed } from 'vue'
import { NFormItem, NInput } from 'naive-ui'
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
    <!-- id/name aren't top-level props on NInput (it forwards them to the
         wrapper, not the inner <textarea>) — inputProps is the actual
         escape hatch to the real DOM element. -->
    <NInput
      type="textarea"
      :input-props="{ id: field.name, name: field.name }"
      :value="modelValue ?? ''"
      :placeholder="field.placeholder"
      :disabled="field.disabled === true"
      :status="hasError ? 'error' : undefined"
      :autosize="{ minRows: 3 }"
      @update:value="(v: string) => emit('update:modelValue', v)"
      @blur="emit('blur')"
    />
  </NFormItem>
</template>
