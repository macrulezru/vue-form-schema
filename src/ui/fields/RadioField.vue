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
const options = computed(() =>
  Array.isArray(props.field.options) ? props.field.options : [],
)
</script>

<template>
  <fieldset
    class="vfs-field vfs-field--radio"
    :class="{ 'vfs-field--error': hasError }"
    :aria-required="field.required ? 'true' : undefined"
    :aria-invalid="hasError ? 'true' : 'false'"
    :aria-describedby="hasError ? errorId : undefined"
  >
    <legend v-if="field.label" class="vfs-field__label">
      {{ field.label }}
      <span v-if="field.required" class="vfs-field__required" aria-hidden="true">*</span>
    </legend>
    <div class="vfs-radio-group">
      <label
        v-for="opt in options"
        :key="String(opt.value)"
        class="vfs-radio-label"
      >
        <input
          type="radio"
          :name="field.name"
          :value="String(opt.value)"
          :checked="modelValue === opt.value"
          :disabled="field.disabled === true"
          class="vfs-radio"
          @change="emit('update:modelValue', opt.value)"
          @blur="emit('blur')"
        />
        {{ opt.label }}
      </label>
    </div>
    <ul
      v-if="hasError"
      :id="errorId"
      class="vfs-field__errors"
      role="alert"
      aria-live="polite"
    >
      <li v-for="(msg, i) in error" :key="i" class="vfs-field__error">{{ msg }}</li>
    </ul>
  </fieldset>
</template>
