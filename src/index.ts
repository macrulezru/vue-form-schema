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
  JSONSchema,
  JSONSchemaField,
  BuiltinRule,
} from './core/types'

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
  ValidationEngine,
  getByPath,
  setByPath,
} from './core/ValidationEngine'

// ConditionEvaluator
export { ConditionEvaluator, evaluateFieldConditions } from './core/ConditionEvaluator'

// MaskEngine
export { applyMask, removeMask, bindMask } from './core/MaskEngine'

// JSON parser (included in core)
export { parseJSON } from './parsers/json'
