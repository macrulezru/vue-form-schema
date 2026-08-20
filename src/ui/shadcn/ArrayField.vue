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
  <div class="mb-4">
    <div v-if="field.label" class="mb-2 text-sm font-medium leading-none">
      {{ field.label }}
    </div>

    <div
      v-for="row in rows"
      :key="row.key"
      class="border-input bg-card mb-2 flex items-start gap-2 rounded-md border p-3"
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
        class="text-muted-foreground hover:text-destructive mt-7 shrink-0 rounded px-2 py-1 text-xs transition-colors"
        @click="remove(row.index)"
      >
        Remove
      </button>
    </div>

    <button
      type="button"
      class="border-input hover:border-ring hover:text-foreground text-muted-foreground mt-1 rounded-md border border-dashed px-4 py-2 text-sm transition-colors"
      @click="append()"
    >
      + Add row
    </button>
  </div>
</template>
