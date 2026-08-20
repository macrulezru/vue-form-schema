<script setup lang="ts">
import { computed } from 'vue'
import RadioButton from 'primevue/radiobutton'
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
    class="mb-4 flex flex-col gap-2"
    :aria-required="field.required ? 'true' : undefined"
    :aria-invalid="hasError ? 'true' : 'false'"
    :aria-describedby="hasError ? errorId : undefined"
  >
    <legend v-if="field.label" class="text-sm font-medium">
      {{ field.label }}
      <span v-if="field.required" class="ml-0.5 text-red-500" aria-hidden="true">*</span>
    </legend>
    <div class="flex flex-col gap-2">
      <label
        v-for="opt in options"
        :key="String(opt.value)"
        class="flex cursor-pointer items-center gap-2.5"
      >
        <RadioButton
          :name="field.name"
          :value="opt.value"
          :model-value="modelValue"
          :disabled="field.disabled === true"
          @update:model-value="(v: unknown) => emit('update:modelValue', v)"
          @blur="emit('blur')"
        />
        <span class="text-sm">{{ opt.label }}</span>
      </label>
    </div>
    <div v-if="hasError" :id="errorId" role="alert" aria-live="polite">
      <p v-for="(msg, i) in error" :key="i" class="text-sm font-medium text-red-500">{{ msg }}</p>
    </div>
  </fieldset>
</template>
