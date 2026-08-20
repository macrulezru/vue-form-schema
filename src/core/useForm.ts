import {
  ref,
  computed,
  watch,
  onMounted,
  onUnmounted,
  getCurrentInstance,
  type Ref,
  type ComputedRef,
} from 'vue'
import type {
  FieldDefinition,
  UseFormConfig,
  UseFormReturn,
  JSONSchema,
  TypedFieldDefinitions,
} from './types'
import { ValidationEngine, getByPath, setByPath } from './ValidationEngine'
import { ConditionEvaluator } from './ConditionEvaluator'
import { parseJSON } from '../parsers/json'
import { registerForm, unregisterForm, emitFormEvent } from './formRegistry'

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
  let result: Record<string, unknown> = {}

  // Field names can be dot-paths (nested group/array children, e.g.
  // "address.city"); every read of `result` elsewhere (getField, setField,
  // FormRenderer's getValue/setValue) goes through getByPath/setByPath,
  // which treat dots as real nesting — so writes here must build the same
  // nested shape via setByPath, not flat `result[field.name] = ...`
  // assignment (which would store a literal "address.city" key that
  // getByPath could never find).

  // Pass 1: resolve static defaults so function defaults can reference them
  for (const field of fields) {
    if (field.type === 'group' && field.fields) {
      const nested = buildInitialValues(field.fields, overrides)
      for (const [key, val] of Object.entries(nested)) {
        result = setByPath(result, key, val)
      }
    } else if (field.type === 'array') {
      const existing = getByPath(overrides, field.name)
      const def = typeof field.defaultValue === 'function' ? undefined : field.defaultValue
      result = setByPath(result, field.name, existing ?? def ?? [])
    } else if (typeof field.defaultValue !== 'function') {
      const existing = getByPath(overrides, field.name)
      result = setByPath(
        result,
        field.name,
        existing !== undefined ? existing : (field.defaultValue ?? null),
      )
    }
  }

  // Pass 2: evaluate function defaults with partial context
  for (const field of fields) {
    if (field.type !== 'group' && typeof field.defaultValue === 'function') {
      const existing = getByPath(overrides, field.name)
      result = setByPath(
        result,
        field.name,
        existing === undefined ? field.defaultValue(result) : existing,
      )
    }
  }

  // merge overrides that are not covered by schema
  for (const [key, val] of Object.entries(overrides)) {
    if (!(key in result)) result = setByPath(result, key, val)
  }

  return result
}

// ─── useForm ──────────────────────────────────────────────────────────────────

// Overload 1: schema comes from parseZod/parseYup/parseValibot — T is
// inferred from the adapter's branded return type, no explicit type param
// needed: `useForm({ schema: parseZod(mySchema) })`.
export function useForm<T extends Record<string, unknown>>(
  config: Omit<UseFormConfig<T>, 'schema'> & { schema: TypedFieldDefinitions<T> },
): UseFormReturn<T>
// Overload 2: plain FieldDefinition[] / JSON schema — T defaults to
// Record<string, unknown> unless given explicitly: `useForm<Values>({ schema })`.
export function useForm<T extends Record<string, unknown> = Record<string, unknown>>(
  config: UseFormConfig<T>,
): UseFormReturn<T>
export function useForm<T extends Record<string, unknown> = Record<string, unknown>>(
  config: UseFormConfig<T>,
): UseFormReturn<T> {
  const {
    schema,
    initialValues = {} as Partial<T>,
    validateOn = 'blur',
    validateMode = 'first',
    clearOnHide = false,
    onSubmit,
    persist = false,
    persistKey,
    debug = false,
  } = config

  // Captured synchronously — getCurrentInstance() only works during setup(),
  // not inside the async/callback code below. Used only as a human-readable
  // label for the DevTools plugin (vue-form-schema/devtools); has no effect
  // when devtools isn't installed.
  const callerComponentType = getCurrentInstance()?.type as
    { __name?: string; name?: string } | undefined
  const callerComponentName = callerComponentType?.__name ?? callerComponentType?.name

  const rawFields: FieldDefinition[] = normaliseSchema(schema)
  const engine = new ValidationEngine(300, validateMode)
  const evaluator = new ConditionEvaluator()
  // Filled in once the full UseFormReturn object exists, right before
  // returning — see the bottom of this function. Declared here (not there)
  // so setField/touchField/submit/reset can close over it.
  let formId = 0

  // ── Persist helpers ───────────────────────────────────────────────────────

  const storageKey = persistKey ?? `vfs:${rawFields.map((f) => f.name).join(',')}`

  function getStorage(): Storage | null {
    if (typeof window === 'undefined' || !persist) return null
    return persist === 'local' ? window.localStorage : window.sessionStorage
  }

  // ── State ──────────────────────────────────────────────────────────────────

  const values = ref<Record<string, unknown>>(
    buildInitialValues(rawFields, initialValues as Record<string, unknown>),
  ) as Ref<T>

  const errors = ref<Record<string, string[]>>({})
  const touched = ref<Record<string, boolean>>({})
  const isSubmitting = ref(false)
  const resolvedFields = ref<FieldDefinition[]>(rawFields)
  const optionsLoading = ref<Record<string, boolean>>({})
  const asyncOptionsCache = ref<Record<string, FieldDefinition['options']>>({})
  // tracks which fields have been blurred at least once — used by 'eager' mode
  const firstBlurred = new Set<string>()
  // suppresses persist watch during reset()
  let skipPersist = false

  // ── Condition evaluation (reactive) ───────────────────────────────────────

  evaluator.start(
    rawFields,
    values as Ref<Record<string, unknown>>,
    resolvedFields,
    clearOnHide ?? false,
  )

  // ── Async options ─────────────────────────────────────────────────────────

  async function fetchAsyncOptions(field: FieldDefinition) {
    if (typeof field.options !== 'function') return
    const result = field.options(values.value as Record<string, unknown>)
    if (!(result instanceof Promise)) return
    optionsLoading.value = { ...optionsLoading.value, [field.name]: true }
    try {
      const opts = await result
      asyncOptionsCache.value = { ...asyncOptionsCache.value, [field.name]: opts }
    } catch (e) {
      console.warn(`[vue-form-schema] Failed to load options for "${field.name}"`, e)
    } finally {
      optionsLoading.value = { ...optionsLoading.value, [field.name]: false }
    }
  }

  // Fields with async options — fetch on mount, re-fetch when optionsDeps change
  const asyncOptionFields = rawFields.filter((f) => typeof f.options === 'function')

  onMounted(async () => {
    // Restore persisted values
    const storage = getStorage()
    if (storage) {
      try {
        const saved = storage.getItem(storageKey)
        if (saved) {
          const parsed = JSON.parse(saved) as Record<string, unknown>
          ;(values as Ref<Record<string, unknown>>).value = {
            ...(values.value as Record<string, unknown>),
            ...parsed,
          }
        }
      } catch {
        /* ignore corrupt storage */
      }
    }

    // Initial async options fetch
    await Promise.all(asyncOptionFields.map((f: FieldDefinition) => fetchAsyncOptions(f)))
  })

  // Persist on every value change
  if (persist) {
    watch(
      values,
      (v) => {
        if (skipPersist) return
        try {
          getStorage()?.setItem(storageKey, JSON.stringify(v))
        } catch {
          /* quota exceeded etc. */
        }
      },
      { deep: true },
    )
  }

  // Re-fetch async options when optionsDeps fields change
  for (const field of asyncOptionFields) {
    if (field.optionsDeps?.length) {
      watch(
        () =>
          field.optionsDeps!.map((dep: string) =>
            getByPath(values.value as Record<string, unknown>, dep),
          ),
        () => fetchAsyncOptions(field),
      )
    }
  }

  // Debug logging
  if (debug) {
    watch(
      values,
      (v) => {
        console.group('[vue-form-schema] values changed')
        console.log('values:', JSON.parse(JSON.stringify(v)))
        console.log('errors:', errors.value)
        console.log('touched:', touched.value)
        console.groupEnd()
      },
      { deep: true },
    )
  }

  // ── Computed ───────────────────────────────────────────────────────────────

  // Merge async options cache and loading state into resolved fields
  const fields: ComputedRef<FieldDefinition[]> = computed(() =>
    resolvedFields.value.map((f) => ({
      ...f,
      options: (asyncOptionsCache.value[f.name] as FieldDefinition['options']) ?? f.options,
      optionsLoading: optionsLoading.value[f.name] ?? false,
    })),
  )

  // initialValues is a plain snapshot passed once at setup — safe to compute
  // the baseline a single time instead of rebuilding + re-stringifying it on
  // every isDirty access
  const initialSnapshot = buildInitialValues(rawFields, initialValues as Record<string, unknown>)

  const isDirty: ComputedRef<boolean> = computed(
    () => !deepEqual(values.value as Record<string, unknown>, initialSnapshot),
  )

  const isValid: ComputedRef<boolean> = computed(() => {
    const errs = engine.validateAll(resolvedFields.value, values.value as Record<string, unknown>)
    const syncValid = Object.values(errs).every((e) => e.length === 0)
    // errors.value also carries the latest resolved async-validator results
    // (merged in by runValidation's onResult callback) — a field that failed
    // an async check must not be reported valid just because its sync
    // validators pass.
    const asyncValid = Object.values(errors.value).every((e) => e.length === 0)
    return syncValid && asyncValid
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
          emitFormEvent(formId, 'asyncValidate', { path, errors: asyncErrors })
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
    const field = findField(resolvedFields.value, path)
    const stored = field?.transform
      ? field.transform(value, values.value as Record<string, unknown>)
      : value

    ;(values as Ref<Record<string, unknown>>).value = setByPath(
      (values as Ref<Record<string, unknown>>).value,
      path,
      stored,
    )
    emitFormEvent(formId, 'setField', { path, value: stored })

    if (validateOn === 'input' || (validateOn === 'eager' && firstBlurred.has(path))) {
      if (field) runValidation(field)
    }
  }

  function getField(path: string): unknown {
    return getByPath(values.value as Record<string, unknown>, path)
  }

  function touchField(path: string) {
    touched.value = { ...touched.value, [path]: true }
    firstBlurred.add(path)
    emitFormEvent(formId, 'touch', { path })

    if (validateOn === 'blur' || validateOn === 'eager') {
      const field = findField(resolvedFields.value, path)
      if (field) runValidation(field)
    }
  }

  async function submit(): Promise<void> {
    emitFormEvent(formId, 'submit')

    // touch all fields
    const allTouched: Record<string, boolean> = {}
    for (const field of resolvedFields.value) markTouched(field, allTouched)
    touched.value = allTouched

    // run full sync validation
    const syncErrors = engine.validateAll(
      resolvedFields.value,
      values.value as Record<string, unknown>,
    )

    // run async validators immediately (bypassing the debounce) so a pending
    // check like "username taken" actually blocks submission instead of
    // resolving after onSubmit has already been called
    const asyncErrors = await engine.validateAllAsync(
      resolvedFields.value,
      values.value as Record<string, unknown>,
    )

    const merged: Record<string, string[]> = { ...syncErrors }
    for (const [path, msgs] of Object.entries(asyncErrors)) {
      merged[path] = [...(merged[path] ?? []), ...msgs]
    }
    errors.value = merged

    const hasErrors = Object.values(errors.value).some((e) => e.length > 0)
    if (hasErrors) {
      emitFormEvent(formId, 'submitError', { reason: 'validation', errors: errors.value })
      return
    }

    isSubmitting.value = true
    try {
      const parsed = applyParse(resolvedFields.value, values.value as Record<string, unknown>)
      await onSubmit?.(parsed as T)
      emitFormEvent(formId, 'submitSuccess')
    } catch (err) {
      emitFormEvent(formId, 'submitError', {
        reason: 'exception',
        error: err instanceof Error ? err.message : String(err),
      })
      throw err
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
    skipPersist = true
    getStorage()?.removeItem(storageKey)
    // re-enable persist after the watch microtask fires
    Promise.resolve().then(() => {
      skipPersist = false
    })
    emitFormEvent(formId, 'reset')
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────

  onUnmounted(() => {
    evaluator.stop()
    engine.destroy()
    unregisterForm(formId)
  })

  const formApi: UseFormReturn<T> = {
    fields,
    values: values as Ref<T>,
    errors,
    touched,
    optionsLoading,
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

  // Registered unconditionally — registerForm/emitFormEvent are cheap
  // no-ops without the DevTools plugin (vue-form-schema/devtools) listening;
  // see src/core/formRegistry.ts.
  formId = registerForm(formApi as UseFormReturn, callerComponentName ?? 'Form')

  return formApi
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

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a instanceof File || b instanceof File) return a === b
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => deepEqual(v, b[i]))
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const aKeys = Object.keys(a as Record<string, unknown>)
    const bKeys = Object.keys(b as Record<string, unknown>)
    return (
      aKeys.length === bKeys.length &&
      aKeys.every((k) =>
        deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]),
      )
    )
  }
  return false
}

function applyParse(
  fields: FieldDefinition[],
  values: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...values }
  for (const field of fields) {
    if (field.parse) {
      const raw = getByPath(result, field.name)
      result[field.name] = field.parse(raw)
    }
    if (field.fields) {
      const nested = applyParse(field.fields, result)
      Object.assign(result, nested)
    }
  }
  return result
}
