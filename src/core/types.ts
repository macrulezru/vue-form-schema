import type { Component } from 'vue'

// ─── Validator types ──────────────────────────────────────────────────────────

export type ValidatorFn = (
  value: unknown,
  values: Record<string, unknown>,
) => string | null

export type AsyncValidatorFn = (
  value: unknown,
  values: Record<string, unknown>,
) => Promise<string | null>

// ─── Mask ─────────────────────────────────────────────────────────────────────

export type MaskPreset =
  | 'phone-ru'
  | 'phone-eu'
  | 'date'
  | 'inn'
  | 'iban'

export interface MaskConfig {
  preset?: MaskPreset
  /** Custom mask pattern: '#' = digit, 'A' = letter, other chars are literals */
  pattern?: string
}

// ─── Field options ─────────────────────────────────────────────────────────────

export interface FieldOption {
  label: string
  value: unknown
}

// ─── FieldDefinition ──────────────────────────────────────────────────────────

export type FieldType =
  | 'text'
  | 'number'
  | 'email'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'textarea'
  | 'date'
  | 'array'
  | 'group'
  | 'file'

export interface FieldDefinition {
  type: FieldType
  /** Dot-path for nested fields, e.g. "address.city" */
  name: string
  label?: string
  placeholder?: string
  defaultValue?: unknown | ((values: Record<string, unknown>) => unknown)
  required?: boolean
  /** Static or dynamic disabled state */
  disabled?: boolean | ((values: Record<string, unknown>) => boolean)
  /** Static or dynamic visibility; string is evaluated as expression */
  visible?: boolean | string | ((values: Record<string, unknown>) => boolean)
  validators?: ValidatorFn[]
  asyncValidators?: AsyncValidatorFn[]
  mask?: string | MaskConfig
  /** For select / radio — static list, sync function, or async function */
  options?: FieldOption[] | ((values: Record<string, unknown>) => FieldOption[] | Promise<FieldOption[]>)
  /**
   * Field names whose values trigger re-fetching of async options.
   * Only relevant when `options` is an async function.
   */
  optionsDeps?: string[]
  /** Internal: set by useForm when async options are loading. Read-only for consumers. */
  optionsLoading?: boolean
  /** For group and array */
  fields?: FieldDefinition[]
  /**
   * Applied on every setField call before the value is stored.
   * Use for trimming, type coercion, formatting, etc.
   */
  transform?: (value: unknown, values: Record<string, unknown>) => unknown
  /**
   * Applied at submit time to produce the final payload value.
   * Runs after all validation passes.
   */
  parse?: (raw: unknown) => unknown
  /**
   * Custom Vue component to render this field.
   * Receives FormFieldProps and must emit 'update:modelValue' and 'blur'.
   */
  component?: Component | string
  // ─── File field options ───────────────────────────────────────────────────
  /** Accepted file types, e.g. "image/*,.pdf" — passed to <input accept> */
  accept?: string
  /** Allow selecting multiple files */
  multiple?: boolean
  /** Maximum file size in bytes */
  maxSize?: number
  /** Maximum number of files (only relevant when multiple=true) */
  maxFiles?: number
}

// ─── Custom field component contract ─────────────────────────────────────────

export interface FormFieldProps {
  field: FieldDefinition
  modelValue: unknown
  error: string[]
  touched: boolean
}

// ─── JSON schema subset (used by parseJSON) ───────────────────────────────────

export interface JSONSchemaField {
  type: FieldType
  name: string
  label?: string
  placeholder?: string
  default?: unknown
  required?: boolean
  disabled?: boolean
  visible?: boolean | string
  options?: FieldOption[]
  fields?: JSONSchemaField[]
  mask?: string | MaskConfig
  validators?: Array<{ rule: string; value?: unknown; message?: string }>
}

export type JSONSchema = JSONSchemaField[]

// ─── useForm config ───────────────────────────────────────────────────────────

export type ValidateOn = 'input' | 'blur' | 'submit' | 'eager'

export type ValidateMode = 'first' | 'all'

export interface UseFormConfig<T extends Record<string, unknown> = Record<string, unknown>> {
  schema: FieldDefinition[] | JSONSchema
  initialValues?: Partial<T>
  validateOn?: ValidateOn
  /** 'first' returns only the first error per field (default); 'all' returns all errors */
  validateMode?: ValidateMode
  clearOnHide?: boolean
  onSubmit?: (values: T) => void | Promise<void>
  /** Persist form values to storage between page reloads */
  persist?: false | 'session' | 'local'
  /** Storage key prefix. Defaults to a hash of the schema field names. */
  persistKey?: string
  /** Log state changes to console */
  debug?: boolean
}

// ─── useForm return ───────────────────────────────────────────────────────────

import type { ComputedRef, Ref } from 'vue'

export interface UseFormReturn<T extends Record<string, unknown> = Record<string, unknown>> {
  fields: ComputedRef<FieldDefinition[]>
  values: Ref<T>
  errors: Ref<Record<string, string[]>>
  touched: Ref<Record<string, boolean>>
  /** Per-field async options loading state */
  optionsLoading: Ref<Record<string, boolean>>
  isDirty: ComputedRef<boolean>
  isValid: ComputedRef<boolean>
  isSubmitting: Ref<boolean>
  submit(): Promise<void>
  reset(values?: Partial<T>): void
  setField(path: string, value: unknown): void
  getField(path: string): unknown
}

// ─── Built-in validator rule names ───────────────────────────────────────────

export type BuiltinRule =
  | 'required'
  | 'minLength'
  | 'maxLength'
  | 'min'
  | 'max'
  | 'pattern'
  | 'email'
  | 'url'
