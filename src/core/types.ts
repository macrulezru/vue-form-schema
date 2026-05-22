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

export interface FieldDefinition {
  type: FieldType
  /** Dot-path for nested fields, e.g. "address.city" */
  name: string
  label?: string
  placeholder?: string
  defaultValue?: unknown
  required?: boolean
  /** Static or dynamic disabled state */
  disabled?: boolean | ((values: Record<string, unknown>) => boolean)
  /** Static or dynamic visibility; string is evaluated as expression */
  visible?: boolean | string | ((values: Record<string, unknown>) => boolean)
  validators?: ValidatorFn[]
  asyncValidators?: AsyncValidatorFn[]
  mask?: string | MaskConfig
  /** For select / radio */
  options?: FieldOption[]
  /** For group and array */
  fields?: FieldDefinition[]
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

export type ValidateOn = 'input' | 'blur' | 'submit'

export interface UseFormConfig<T extends Record<string, unknown> = Record<string, unknown>> {
  schema: FieldDefinition[] | JSONSchema
  initialValues?: Partial<T>
  validateOn?: ValidateOn
  clearOnHide?: boolean
  onSubmit?: (values: T) => void | Promise<void>
}

// ─── useForm return ───────────────────────────────────────────────────────────

import type { ComputedRef, Ref } from 'vue'

export interface UseFormReturn<T extends Record<string, unknown> = Record<string, unknown>> {
  fields: ComputedRef<FieldDefinition[]>
  values: Ref<T>
  errors: Ref<Record<string, string[]>>
  touched: Ref<Record<string, boolean>>
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
