<script setup lang="ts">
import { computed } from 'vue'
import { NFormItem, NRadio, NRadioGroup, NSpace } from 'naive-ui'
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

// naive-ui's Radio value type is narrower (string | number | boolean) than
// this library's intentionally loose FieldOption['value'] (unknown) — cast
// at the boundary, same approach used in the Zod/Yup/Valibot adapters for
// the same kind of external-type friction. Done here in script (not inline
// in the template) because vue-eslint-parser misreads a `|` union inside a
// template `as` cast as a Vue 2 filter pipe.
const options = computed(() =>
  (Array.isArray(props.field.options) ? props.field.options : []).map((opt) => ({
    label: opt.label,
    value: opt.value as string | number | boolean,
  })),
)
const radioValue = computed(() => props.modelValue as string | number | boolean | null)
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
    <NRadioGroup
      :name="field.name"
      :value="radioValue"
      :disabled="field.disabled === true"
      @update:value="(v: unknown) => emit('update:modelValue', v)"
      @blur="emit('blur')"
    >
      <NSpace vertical>
        <NRadio v-for="opt in options" :key="String(opt.value)" :value="opt.value">
          {{ opt.label }}
        </NRadio>
      </NSpace>
    </NRadioGroup>
  </NFormItem>
</template>
