import type { FieldDefinition, JSONSchema, JSONSchemaField, ValidatorFn } from '../core/types'
import {
  required,
  minLength,
  maxLength,
  min,
  max,
  pattern,
  email,
  url,
} from '../core/ValidationEngine'

// ─── Rule → ValidatorFn ───────────────────────────────────────────────────────

function ruleToValidator(
  rule: string,
  value: unknown,
  message?: string,
): ValidatorFn | null {
  switch (rule) {
    case 'required':
      return message
        ? (v, vals) => (required(v, vals) ? message : null)
        : required
    case 'minLength':
      return minLength(Number(value), message)
    case 'maxLength':
      return maxLength(Number(value), message)
    case 'min':
      return min(Number(value), message)
    case 'max':
      return max(Number(value), message)
    case 'pattern':
      return pattern(new RegExp(String(value)), message)
    case 'email':
      return message
        ? (v, vals) => (email(v, vals) ? message : null)
        : email
    case 'url':
      return message
        ? (v, vals) => (url(v, vals) ? message : null)
        : url
    default:
      console.warn(`[vue-form-schema] Unknown validator rule: "${rule}"`)
      return null
  }
}

// ─── Recursive field converter ────────────────────────────────────────────────

function convertField(raw: JSONSchemaField): FieldDefinition {
  const validators: ValidatorFn[] = []

  for (const v of raw.validators ?? []) {
    const fn = ruleToValidator(v.rule, v.value, v.message)
    if (fn) validators.push(fn)
  }

  return {
    type: raw.type,
    name: raw.name,
    label: raw.label,
    placeholder: raw.placeholder,
    defaultValue: raw.default,
    required: raw.required,
    disabled: raw.disabled,
    visible: raw.visible,
    mask: raw.mask,
    options: raw.options,
    validators: validators.length ? validators : undefined,
    fields: raw.fields ? raw.fields.map(convertField) : undefined,
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function parseJSON(schema: JSONSchema): FieldDefinition[] {
  return schema.map(convertField)
}
