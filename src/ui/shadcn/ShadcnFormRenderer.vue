<script setup lang="ts">
import { computed, type Component } from 'vue'
import type { FieldDefinition, UseFormReturn } from '../../core/types'
import { useRegistry } from '../../core/registry'
import { getByPath } from '../../core/ValidationEngine'
import TextField from './TextField.vue'
import NumberField from './NumberField.vue'
import TextareaField from './TextareaField.vue'
import SelectField from './SelectField.vue'
import CheckboxField from './CheckboxField.vue'
import RadioField from './RadioField.vue'
import DateField from './DateField.vue'
import FileField from './FileField.vue'
import ArrayField from './ArrayField.vue'

const props = defineProps<{
  form: UseFormReturn
  components?: Partial<Record<FieldDefinition['type'], Component | string>>
  submitLabel?: string
  /**
   * Internal: the field list to render. Used by the `group` case to recurse
   * into `field.fields` instead of re-rendering the whole top-level schema
   * (which would recurse into the same group forever). Defaults to the
   * form's top-level fields — not meant to be passed by consumers.
   */
  fields?: FieldDefinition[]
}>()

const registry = useRegistry()

const emit = defineEmits<{ submit: [] }>()

const defaultComponents: Partial<Record<FieldDefinition['type'], Component>> = {
  text: TextField,
  email: TextField,
  number: NumberField,
  textarea: TextareaField,
  select: SelectField,
  checkbox: CheckboxField,
  radio: RadioField,
  date: DateField,
  file: FileField,
}

function resolveComponent(field: FieldDefinition): Component | string | null {
  if (field.component) return field.component
  return (
    props.components?.[field.type] ?? registry[field.type] ?? defaultComponents[field.type] ?? null
  )
}

function getValue(field: FieldDefinition) {
  return getByPath(props.form.values.value as Record<string, unknown>, field.name)
}
function setValue(field: FieldDefinition, value: unknown) {
  props.form.setField(field.name, value)
}
function touchField(field: FieldDefinition) {
  const form = props.form as UseFormReturn & { touchField?: (p: string) => void }
  form.touchField?.(field.name)
}
function getErrors(field: FieldDefinition): string[] {
  return props.form.errors.value[field.name] ?? []
}
function isTouched(field: FieldDefinition): boolean {
  return props.form.touched.value[field.name] ?? false
}

const visibleFields = computed(() =>
  (props.fields ?? props.form.fields.value).filter((f) => f.visible !== false),
)

async function onSubmit(e: Event) {
  e.preventDefault()
  await props.form.submit()
  emit('submit')
}
</script>

<template>
  <form novalidate @submit="onSubmit">
    <template v-for="field in visibleFields" :key="field.name">
      <slot
        v-if="$slots[`field-${field.name}`]"
        :name="`field-${field.name}`"
        :field="field"
        :value="getValue(field)"
        :error="getErrors(field)"
        :touched="isTouched(field)"
        :set-value="(v: unknown) => setValue(field, v)"
        :touch="() => touchField(field)"
      />

      <fieldset v-else-if="field.type === 'group'" class="border-input mb-4 rounded-md border p-4">
        <legend v-if="field.label" class="px-1 text-sm font-medium leading-none">
          {{ field.label }}
        </legend>
        <ShadcnFormRenderer
          v-if="field.fields"
          :form="form"
          :fields="field.fields"
          :components="components"
        />
      </fieldset>

      <ArrayField
        v-else-if="field.type === 'array'"
        :field="field"
        :form="form"
        :components="components"
      />

      <component
        :is="resolveComponent(field)"
        v-else-if="resolveComponent(field)"
        :field="field"
        :model-value="getValue(field)"
        :error="getErrors(field)"
        :touched="isTouched(field)"
        @update:model-value="setValue(field, $event)"
        @blur="touchField(field)"
      />
    </template>

    <slot name="submit" :is-submitting="form.isSubmitting.value" :is-valid="form.isValid.value">
      <button
        type="submit"
        :disabled="form.isSubmitting.value"
        class="bg-primary text-primary-foreground hover:bg-primary/90 mt-2 inline-flex h-9 items-center justify-center rounded-md px-4 py-2 text-sm font-medium shadow transition-colors disabled:pointer-events-none disabled:opacity-50"
      >
        {{ submitLabel ?? 'Submit' }}
      </button>
    </slot>
  </form>
</template>
