<script setup lang="ts">
import { computed } from 'vue'
import BaseField from './BaseField.vue'
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

const options = computed(() => (Array.isArray(props.field.options) ? props.field.options : []))

function onChange(e: Event) {
  const target = e.target as HTMLSelectElement
  const selected = options.value.find((o) => String(o.value) === target.value)
  emit('update:modelValue', selected?.value ?? target.value)
}
</script>

<template>
  <BaseField v-slot="aria" :field="field" :error="error" :touched="touched">
    <div v-if="field.optionsLoading" class="vfs-select-loading">Loading…</div>
    <select
      v-else
      :id="field.name"
      :name="field.name"
      :disabled="field.disabled === true || field.optionsLoading"
      :required="field.required"
      v-bind="aria"
      class="vfs-select"
      @change="onChange"
      @blur="emit('blur')"
    >
      <option
        value=""
        disabled
        :selected="modelValue === null || modelValue === undefined || modelValue === ''"
      >
        {{ field.placeholder ?? 'Select an option' }}
      </option>
      <option
        v-for="opt in options"
        :key="String(opt.value)"
        :value="String(opt.value)"
        :selected="modelValue === opt.value"
      >
        {{ opt.label }}
      </option>
    </select>
  </BaseField>
</template>
