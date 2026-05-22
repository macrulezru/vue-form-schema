// ─── Public API ───────────────────────────────────────────────────────────────

// Types
export type {
  FieldDefinition,
  FieldType,
  FieldOption,
  MaskConfig,
  MaskPreset,
  ValidatorFn,
  AsyncValidatorFn,
  UseFormConfig,
  UseFormReturn,
  ValidateOn,
  ValidateMode,
  JSONSchema,
  JSONSchemaField,
  BuiltinRule,
  FormFieldProps,
} from './core/types'

// Component registry (Vue plugin)
export { createFormRegistry, useRegistry, provideRegistry } from './core/registry'
export type { ComponentMap } from './core/registry'

// useFormField helper for custom field component authors
export { useFormField } from './core/useFormField'

// useFieldArray — dynamic array field management
export { useFieldArray } from './core/useFieldArray'
export type { FieldArrayRow, UseFieldArrayReturn } from './core/useFieldArray'

// useMultiStepForm — multi-step form wizard
export { useMultiStepForm } from './core/useMultiStepForm'
export type { MultiStepFormReturn } from './core/useMultiStepForm'

// useFormDebug — reactive snapshot of form state
export { useFormDebug } from './core/useFormDebug'
export type { FormSnapshot } from './core/useFormDebug'

// useForm composable
export { useForm } from './core/useForm'

// Built-in validators
export {
  required,
  minLength,
  maxLength,
  min,
  max,
  pattern,
  email,
  url,
  sameAs,
  fileType,
  fileSize,
  fileCount,
  ValidationEngine,
  getByPath,
  setByPath,
} from './core/ValidationEngine'

// Schema composition utilities
export { mergeSchemas, omitFields, pickFields, extendField } from './core/schemaUtils'

// TypeScript inference helpers
export type { InferValues } from './core/inferTypes'
export { defineSchema } from './core/inferTypes'

// ConditionEvaluator
export { ConditionEvaluator, evaluateFieldConditions } from './core/ConditionEvaluator'

// MaskEngine
export { applyMask, removeMask, bindMask } from './core/MaskEngine'

// JSON parser (included in core)
export { parseJSON } from './parsers/json'
