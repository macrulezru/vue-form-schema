import { ref, computed, onUnmounted, type Ref, type ComputedRef } from 'vue'
import type { FieldDefinition, UseFormConfig, UseFormReturn, JSONSchema } from './types'
import { ValidationEngine, getByPath, setByPath } from './ValidationEngine'
import { ConditionEvaluator } from './ConditionEvaluator'
import { parseJSON } from '../parsers/json'

// ─── Schema normalisation ─────────────────────────────────────────────────────

function isJSONSchema(schema: FieldDefinition[] | JSONSchema): schema is JSONSchema {
  if (!Array.isArray(schema) || schema.length === 0) return false

  // If any field has a function validator it's already FieldDefinition[]
  for (const field of schema) {
    const validators = (field as unknown as Record<string, unknown>).validators
    if (Array.isArray(validators) && validators.some((v) => typeof v === 'function')) {
      return false
    }
  }

  // Treat as JSON schema only when there are explicit JSON schema markers:
  // 'default' key (vs FieldDefinition's 'defaultValue') or rule-object validators
  return schema.some((f) => {
    const field = f as unknown as Record<string, unknown>
    if ('default' in field) return true
    const v = field.validators
    return (
      Array.isArray(v) &&
      v.length > 0 &&
      typeof v[0] === 'object' &&
      v[0] !== null &&
      'rule' in (v[0] as Record<string, unknown>)
    )
  })
}

function normaliseSchema(schema: FieldDefinition[] | JSONSchema): FieldDefinition[] {
  // If every item already has the FieldDefinition shape (validators array etc.) treat as-is.
  // A FieldDefinition[] can come from the parsers directly; a JSON schema has validator-rule objects.
  if (isJSONSchema(schema)) return parseJSON(schema)
  return schema as FieldDefinition[]
}

// ─── Build initial values from field defaults ─────────────────────────────────

function buildInitialValues(
  fields: FieldDefinition[],
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const field of fields) {
    if (field.type === 'group' && field.fields) {
      const nested = buildInitialValues(field.fields, overrides)
      Object.assign(result, nested)
    } else if (field.type === 'array') {
      const existing = getByPath(overrides, field.name)
      result[field.name] = existing ?? field.defaultValue ?? []
    } else {
      const existing = getByPath(overrides, field.name)
      result[field.name] = existing !== undefined ? existing : (field.defaultValue ?? null)
    }
  }

  // merge overrides that are not covered by schema
  for (const [key, val] of Object.entries(overrides)) {
    if (!(key in result)) result[key] = val
  }

  return result
}

// ─── useForm ──────────────────────────────────────────────────────────────────

export function useForm<T extends Record<string, unknown> = Record<string, unknown>>(
  config: UseFormConfig<T>,
): UseFormReturn<T> {
  const {
    schema,
    initialValues = {} as Partial<T>,
    validateOn = 'blur',
    clearOnHide = false,
    onSubmit,
  } = config

  const rawFields: FieldDefinition[] = normaliseSchema(schema)
  const engine = new ValidationEngine()
  const evaluator = new ConditionEvaluator()

  // ── State ──────────────────────────────────────────────────────────────────

  const values = ref<Record<string, unknown>>(
    buildInitialValues(rawFields, initialValues as Record<string, unknown>),
  ) as Ref<T>

  const errors = ref<Record<string, string[]>>({})
  const touched = ref<Record<string, boolean>>({})
  const isSubmitting = ref(false)
  const resolvedFields = ref<FieldDefinition[]>(rawFields)

  // ── Condition evaluation (reactive) ───────────────────────────────────────

  evaluator.start(rawFields, values as Ref<Record<string, unknown>>, resolvedFields, clearOnHide ?? false)

  // ── Computed ───────────────────────────────────────────────────────────────

  const fields: ComputedRef<FieldDefinition[]> = computed(() => resolvedFields.value)

  const isDirty: ComputedRef<boolean> = computed(() => {
    const initial = buildInitialValues(rawFields, initialValues as Record<string, unknown>)
    return JSON.stringify(values.value) !== JSON.stringify(initial)
  })

  const isValid: ComputedRef<boolean> = computed(() => {
    const errs = engine.validateAll(resolvedFields.value, values.value as Record<string, unknown>)
    return Object.values(errs).every((e) => e.length === 0)
  })

  // ── Validation helpers ────────────────────────────────────────────────────

  function runValidation(field?: FieldDefinition) {
    if (field) {
      const fieldErrors = engine.validateField(
        field,
        getByPath(values.value as Record<string, unknown>, field.name),
        values.value as Record<string, unknown>,
      )
      errors.value = { ...errors.value, [field.name]: fieldErrors }

      engine.validateAsync(
        field,
        getByPath(values.value as Record<string, unknown>, field.name),
        values.value as Record<string, unknown>,
        (path, asyncErrors) => {
          errors.value = {
            ...errors.value,
            [path]: [...(errors.value[path] ?? []), ...asyncErrors],
          }
        },
      )
    } else {
      errors.value = engine.validateAll(
        resolvedFields.value,
        values.value as Record<string, unknown>,
      )
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────

  function setField(path: string, value: unknown) {
    ;(values as Ref<Record<string, unknown>>).value = setByPath(
      (values as Ref<Record<string, unknown>>).value,
      path,
      value,
    )

    if (validateOn === 'input') {
      const field = findField(resolvedFields.value, path)
      if (field) runValidation(field)
    }
  }

  function getField(path: string): unknown {
    return getByPath(values.value as Record<string, unknown>, path)
  }

  function touchField(path: string) {
    touched.value = { ...touched.value, [path]: true }

    if (validateOn === 'blur') {
      const field = findField(resolvedFields.value, path)
      if (field) runValidation(field)
    }
  }

  async function submit(): Promise<void> {
    // touch all fields
    const allTouched: Record<string, boolean> = {}
    for (const field of resolvedFields.value) markTouched(field, allTouched)
    touched.value = allTouched

    // run full sync validation
    errors.value = engine.validateAll(
      resolvedFields.value,
      values.value as Record<string, unknown>,
    )

    const hasErrors = Object.values(errors.value).some((e) => e.length > 0)
    if (hasErrors) return

    isSubmitting.value = true
    try {
      await onSubmit?.(values.value)
    } finally {
      isSubmitting.value = false
    }
  }

  function reset(newValues?: Partial<T>) {
    const base = newValues ?? initialValues
    ;(values as Ref<Record<string, unknown>>).value = buildInitialValues(
      rawFields,
      (base ?? {}) as Record<string, unknown>,
    )
    errors.value = {}
    touched.value = {}
    isSubmitting.value = false
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────

  onUnmounted(() => {
    evaluator.stop()
    engine.destroy()
  })

  return {
    fields,
    values: values as Ref<T>,
    errors,
    touched,
    isDirty,
    isValid,
    isSubmitting,
    submit,
    reset,
    setField,
    getField,
    // expose touch for FormRenderer
    // @ts-expect-error - internal
    touchField,
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function findField(fields: FieldDefinition[], path: string): FieldDefinition | undefined {
  for (const field of fields) {
    if (field.name === path) return field
    if (field.fields) {
      const found = findField(field.fields, path)
      if (found) return found
    }
  }
  return undefined
}

function markTouched(field: FieldDefinition, touched: Record<string, boolean> = {}) {
  touched[field.name] = true
  if (field.fields) field.fields.forEach((f) => markTouched(f, touched))
  return touched
}
