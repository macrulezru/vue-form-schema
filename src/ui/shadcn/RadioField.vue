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
const options = computed(() => (Array.isArray(props.field.options) ? props.field.options : []))
</script>

<template>
  <fieldset
    class="mb-4 space-y-2"
    :aria-required="field.required ? 'true' : undefined"
    :aria-invalid="hasError ? 'true' : 'false'"
    :aria-describedby="hasError ? errorId : undefined"
  >
    <legend v-if="field.label" class="text-sm font-medium leading-none">
      {{ field.label }}
      <span v-if="field.required" class="text-destructive ml-0.5" aria-hidden="true">*</span>
    </legend>
    <div class="space-y-2">
      <label
        v-for="opt in options"
        :key="String(opt.value)"
        class="flex cursor-pointer items-center gap-2.5"
      >
        <input
          type="radio"
          :name="field.name"
          :value="String(opt.value)"
          :checked="modelValue === opt.value"
          :disabled="field.disabled === true"
          class="border-primary text-primary focus-visible:ring-ring h-4 w-4 cursor-pointer focus-visible:outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50"
          @change="emit('update:modelValue', opt.value)"
          @blur="emit('blur')"
        />
        <span class="text-sm leading-none">{{ opt.label }}</span>
      </label>
    </div>
    <ul v-if="hasError" :id="errorId" class="space-y-0.5" role="alert" aria-live="polite">
      <li v-for="(msg, i) in error" :key="i" class="text-destructive text-sm font-medium">
        {{ msg }}
      </li>
    </ul>
  </fieldset>
</template>
