<script setup lang="ts">
import { computed, type Component } from 'vue'
import type { FieldDefinition, UseFormReturn } from '../core/types'
import { useRegistry } from '../core/registry'
import { getByPath } from '../core/ValidationEngine'
import TextField from './fields/TextField.vue'
import NumberField from './fields/NumberField.vue'
import TextareaField from './fields/TextareaField.vue'
import SelectField from './fields/SelectField.vue'
import CheckboxField from './fields/CheckboxField.vue'
import RadioField from './fields/RadioField.vue'
import DateField from './fields/DateField.vue'
import ArrayField from './fields/ArrayField.vue'
import FileField from './fields/FileField.vue'

// ─── Props ────────────────────────────────────────────────────────────────────

const props = defineProps<{
  form: UseFormReturn
  /** Override individual field renderers: { text: MyTextInput, ... } */
  components?: Partial<Record<FieldDefinition['type'], Component | string>>
  /** Label for the submit button */
  submitLabel?: string
}>()

// app-level registry (installed via createFormRegistry plugin)
const registry = useRegistry()

const emit = defineEmits<{
  submit: []
}>()

// ─── Default component map ────────────────────────────────────────────────────

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
  // priority: field.component > prop override > app registry > built-in defaults
  if (field.component) return field.component
  return props.components?.[field.type] ?? registry[field.type] ?? defaultComponents[field.type] ?? null
}

// ─── Field value helpers ──────────────────────────────────────────────────────

function getValue(field: FieldDefinition): unknown {
  return getByPath(props.form.values.value as Record<string, unknown>, field.name)
}

function setValue(field: FieldDefinition, value: unknown) {
  props.form.setField(field.name, value)
}

function touchField(field: FieldDefinition) {
  // useForm exposes touchField internally
  const form = props.form as UseFormReturn & { touchField?: (path: string) => void }
  form.touchField?.(field.name)
}

function getErrors(field: FieldDefinition): string[] {
  return props.form.errors.value[field.name] ?? []
}

function isTouched(field: FieldDefinition): boolean {
  return props.form.touched.value[field.name] ?? false
}

// ─── Visible fields ───────────────────────────────────────────────────────────

const visibleFields = computed(() =>
  props.form.fields.value.filter((f) => f.visible !== false),
)

async function onSubmit(e: Event) {
  e.preventDefault()
  await props.form.submit()
  emit('submit')
}
</script>

<template>
  <form class="vfs-form" novalidate @submit="onSubmit">
    <template v-for="field in visibleFields" :key="field.name">
      <!-- Named slot: #field-{name} overrides the entire field -->
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

      <!-- group -->
      <fieldset v-else-if="field.type === 'group'" class="vfs-group">
        <legend v-if="field.label">{{ field.label }}</legend>
        <FormRenderer
          v-if="field.fields"
          :form="form"
          :components="components"
        />
      </fieldset>

      <!-- array -->
      <ArrayField
        v-else-if="field.type === 'array'"
        :field="field"
        :form="form"
        :components="components"
      />

      <!-- known field component (field.component wins over type-based lookup) -->
      <component
        :is="resolveComponent(field)"
        v-else-if="resolveComponent(field)"
        :field="field"
        :model-value="getValue(field)"
        :error="getErrors(field)"
        :touched="isTouched(field)"
        @update:model-value="setValue(field, $event)"
        @blur="touchField(field)"
      >
        <!-- Named slot: #label-{name} -->
        <template v-if="$slots[`label-${field.name}`]" #label>
          <slot :name="`label-${field.name}`" :field="field" />
        </template>
        <!-- Named slot: #error-{name} -->
        <template v-if="$slots[`error-${field.name}`]" #error>
          <slot :name="`error-${field.name}`" :field="field" :error="getErrors(field)" />
        </template>
      </component>
    </template>

    <!-- Submit slot -->
    <slot name="submit" :is-submitting="form.isSubmitting.value" :is-valid="form.isValid.value">
      <button type="submit" :disabled="form.isSubmitting.value" class="vfs-submit">
        {{ submitLabel ?? 'Submit' }}
      </button>
    </slot>
  </form>
</template>
