/**
 * Yup adapter — subentry-point 'vue-form-schema/yup'
 * Yup is a peer dependency; this file does a lazy import so the core bundle
 * is not bloated when Yup is not used.
 */

import type { FieldDefinition, ValidatorFn } from '../core/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type YupSchema = any

// ─── Helpers ──────────────────────────────────────────────────────────────────

function yupTypeToFieldType(yupType: string): FieldDefinition['type'] {
  switch (yupType) {
    case 'string': return 'text'
    case 'number': return 'number'
    case 'boolean': return 'checkbox'
    case 'array': return 'array'
    case 'object': return 'group'
    default: return 'text'
  }
}

function yupToValidators(schema: YupSchema, isRequired: boolean): ValidatorFn[] {
  const validators: ValidatorFn[] = []

  if (isRequired) {
    validators.push((value) => {
      if (value === null || value === undefined || value === '') return 'This field is required'
      return null
    })
  }

  // Delegate to yup's own validateSync for other rules
  validators.push((value) => {
    try {
      schema.validateSync(value, { abortEarly: true })
      return null
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'message' in err) {
        return (err as { message: string }).message
      }
      return 'Invalid value'
    }
  })

  return validators
}

function convertYupField(name: string, schema: YupSchema): FieldDefinition {
  const isRequired = !schema.spec.optional && !schema.spec.nullable
  const label = schema.spec.label ?? name
  const fieldType = yupTypeToFieldType(schema.type)

  if (schema.type === 'object' && schema.fields) {
    return {
      type: 'group',
      name,
      label,
      required: isRequired,
      fields: Object.entries(schema.fields).map(([key, child]) =>
        convertYupField(`${name}.${key}`, child),
      ),
    }
  }

  return {
    type: fieldType,
    name,
    label,
    defaultValue: schema.spec.default,
    required: isRequired,
    validators: yupToValidators(schema, isRequired),
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function parseYup(schema: YupSchema): FieldDefinition[] {
  if (schema.type !== 'object') {
    throw new Error('[vue-form-schema] parseYup expects an object schema')
  }
  return Object.entries(schema.fields ?? {}).map(([name, field]) =>
    convertYupField(name, field),
  )
}
