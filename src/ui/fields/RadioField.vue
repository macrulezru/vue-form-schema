<script setup lang="ts">
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
</script>

<template>
  <BaseField :field="field" :error="error" :touched="touched">
    <div class="vfs-radio-group" role="radiogroup" :aria-labelledby="field.name + '-label'">
      <label
        v-for="opt in field.options"
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
  </BaseField>
</template>
