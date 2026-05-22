<script setup lang="ts">
import { computed } from 'vue'
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
const errorId = computed(() => `${props.field.name}-error`)
</script>

<template>
  <fieldset
    class="mb-4"
    :aria-required="field.required ? 'true' : undefined"
    :aria-invalid="hasError ? 'true' : 'false'"
    :aria-describedby="hasError ? errorId : undefined"
  >
    <legend
      v-if="field.label"
      class="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2"
    >
      {{ field.label }}
      <span v-if="field.required" class="text-red-400 ml-0.5" aria-hidden="true">*</span>
    </legend>
    <div class="space-y-2">
      <label
        v-for="opt in field.options"
        :key="String(opt.value)"
        class="flex cursor-pointer items-center gap-2.5"
      >
        <input
          type="radio"
          :name="field.name"
          :value="String(opt.value)"
          :checked="modelValue === opt.value"
          :disabled="field.disabled === true"
          class="h-4 w-4 cursor-pointer border-gray-600 bg-gray-900 text-indigo-500 accent-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          @change="emit('update:modelValue', opt.value)"
          @blur="emit('blur')"
        />
        <span class="text-sm text-gray-200">{{ opt.label }}</span>
      </label>
    </div>
    <ul
      v-if="hasError"
      :id="errorId"
      class="mt-1 space-y-0.5"
      role="alert"
      aria-live="polite"
    >
      <li v-for="(msg, i) in error" :key="i" class="text-red-400 text-xs">{{ msg }}</li>
    </ul>
  </fieldset>
</template>
