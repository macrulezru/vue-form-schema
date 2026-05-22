<script setup lang="ts">
import { type Component } from 'vue'
import { useFieldArray } from '../../core/useFieldArray'
import { useRegistry } from '../../core/registry'
import { getByPath } from '../../core/ValidationEngine'
import type { FieldDefinition, UseFormReturn } from '../../core/types'
import BaseField from './BaseField.vue'
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
  text: TextField,
  email: TextField,
  number: NumberField,
  textarea: TextareaField,
  select: SelectField,
  checkbox: CheckboxField,
  radio: RadioField,
  date: DateField,
}

function resolveComponent(f: FieldDefinition): Component | string | null {
  if (f.component) return f.component
  return props.components?.[f.type] ?? registry[f.type] ?? defaultComponents[f.type] ?? null
}

const { rows, append, remove } = useFieldArray(props.form, props.field.name)

function getValue(f: FieldDefinition) {
  return getByPath(props.form.values.value as Record<string, unknown>, f.name)
}

function setValue(f: FieldDefinition, value: unknown) {
  props.form.setField(f.name, value)
}

function touchField(f: FieldDefinition) {
  const form = props.form as UseFormReturn & { touchField?: (p: string) => void }
  form.touchField?.(f.name)
}

function getErrors(f: FieldDefinition): string[] {
  return props.form.errors.value[f.name] ?? []
}

function isTouched(f: FieldDefinition): boolean {
  return props.form.touched.value[f.name] ?? false
}
</script>

<template>
  <div class="vfs-array">
    <BaseField :field="{ ...field, label: undefined }" :error="[]" :touched="false">
      <div v-if="field.label" class="vfs-field__label">{{ field.label }}</div>

      <div v-for="row in rows" :key="row.key" class="vfs-array__row">
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
        <button type="button" class="vfs-array__remove" @click="remove(row.index)">
          Remove
        </button>
      </div>

      <button type="button" class="vfs-array__add" @click="append()">
        + Add row
      </button>
    </BaseField>
  </div>
</template>
