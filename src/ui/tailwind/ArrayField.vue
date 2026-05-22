<script setup lang="ts">
import { type Component } from 'vue'
import { useFieldArray } from '../../core/useFieldArray'
import { useRegistry } from '../../core/registry'
import { getByPath } from '../../core/ValidationEngine'
import type { FieldDefinition, UseFormReturn } from '../../core/types'
import TextField from './TextField.vue'
import NumberField from './NumberField.vue'
import TextareaField from './TextareaField.vue'
import SelectField from './SelectField.vue'
import CheckboxField from './CheckboxField.vue'
import RadioField from './RadioField.vue'
import DateField from './DateField.vue'

const props = defineProps<{
  field: FieldDefinition
  form: UseFormReturn
  components?: Partial<Record<FieldDefinition['type'], Component | string>>
}>()

const registry = useRegistry()

const defaultComponents: Partial<Record<FieldDefinition['type'], Component>> = {
  text: TextField, email: TextField, number: NumberField,
  textarea: TextareaField, select: SelectField,
  checkbox: CheckboxField, radio: RadioField, date: DateField,
}

function resolveComponent(f: FieldDefinition): Component | string | null {
  if (f.component) return f.component
  return props.components?.[f.type] ?? registry[f.type] ?? defaultComponents[f.type] ?? null
}

const { rows, append, remove } = useFieldArray(props.form, props.field.name)

function getValue(f: FieldDefinition) {
  return getByPath(props.form.values.value as Record<string, unknown>, f.name)
}
function setValue(f: FieldDefinition, value: unknown) { props.form.setField(f.name, value) }
function touchField(f: FieldDefinition) {
  const form = props.form as UseFormReturn & { touchField?: (p: string) => void }
  form.touchField?.(f.name)
}
function getErrors(f: FieldDefinition): string[] { return props.form.errors.value[f.name] ?? [] }
function isTouched(f: FieldDefinition): boolean { return props.form.touched.value[f.name] ?? false }
</script>

<template>
  <div class="mb-4">
    <div
      v-if="field.label"
      class="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2"
    >
      {{ field.label }}
    </div>

    <div
      v-for="row in rows"
      :key="row.key"
      class="mb-2 flex items-start gap-2 rounded-lg border border-gray-700 bg-gray-900 p-3"
    >
      <div class="flex-1 space-y-0">
        <template v-for="subField in row.fields" :key="subField.name">
          <component
            :is="resolveComponent(subField)"
            v-if="resolveComponent(subField)"
            :field="subField"
            :model-value="getValue(subField)"
            :error="getErrors(subField)"
            :touched="isTouched(subField)"
            @update:model-value="setValue(subField, $event)"
            @blur="touchField(subField)"
          />
        </template>
      </div>
      <button
        type="button"
        class="mt-7 shrink-0 rounded px-2 py-1 text-xs text-gray-500 hover:bg-red-500/10 hover:text-red-400 transition"
        @click="remove(row.index)"
      >
        Remove
      </button>
    </div>

    <button
      type="button"
      class="mt-1 rounded-lg border border-dashed border-gray-600 px-4 py-2 text-sm text-gray-400 hover:border-indigo-500 hover:text-indigo-400 transition"
      @click="append()"
    >
      + Add row
    </button>
  </div>
</template>
