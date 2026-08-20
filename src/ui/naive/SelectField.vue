<script setup lang="ts">
import { computed } from 'vue'
import { NFormItem, NSelect, type SelectOption } from 'naive-ui'
import type { FieldDefinition } from '../../core/types'

const props = defineProps<{
  field: FieldDefinition
  modelValue: unknown
  error?: string[]
  touched?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: unknown]
  blur: []
}>()

const hasError = computed(() => !!(props.touched && props.error?.length))

// naive-ui's Select/option value types are narrower (string | number |
// boolean) than this library's intentionally loose FieldOption['value']
// (unknown) — cast at the boundary, same approach used in the Zod/Yup/
// Valibot adapters for the same kind of external-type friction. Done here
// in script (not inline in the template) because vue-eslint-parser
// misreads a `|` union inside a template `as` cast as a Vue 2 filter pipe.
const options = computed<SelectOption[]>(
  () =>
    (Array.isArray(props.field.options) ? props.field.options : []) as unknown as SelectOption[],
)
const selectValue = computed(() => props.modelValue as string | number | null)
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
    <NSelect
      :input-props="{ id: field.name, name: field.name }"
      :value="selectValue"
      :options="options"
      :placeholder="field.placeholder ?? 'Select an option'"
      :disabled="field.disabled === true || field.optionsLoading"
      :loading="field.optionsLoading"
      :status="hasError ? 'error' : undefined"
      @update:value="(v: unknown) => emit('update:modelValue', v)"
      @blur="emit('blur')"
    />
  </NFormItem>
</template>
