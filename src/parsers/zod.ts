/**
 * Zod adapter — subentry-point 'vue-form-schema/zod'
 * Zod is a peer dependency; this file does a lazy import so the core bundle
 * is not bloated when Zod is not used.
 */

import type { FieldDefinition, ValidatorFn } from '../core/types'

// Minimal Zod type surface we need (avoid importing zod types at build time).
// All optional message fields use `string | undefined` so the type is
// compatible with exactOptionalPropertyTypes and Zod's own generated types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ZodTypeAny = any

// ─── Mapping helpers ──────────────────────────────────────────────────────────

function zodTypeName(schema: ZodTypeAny): string {
  let def = schema._def
  while (def.typeName === 'ZodOptional' || def.typeName === 'ZodNullable' || def.typeName === 'ZodDefault') {
    def = def.innerType?._def ?? def
    break
  }
  return def.typeName
}

function zodToFieldType(schema: ZodTypeAny): FieldDefinition['type'] {
  const name = zodTypeName(schema)
  switch (name) {
    case 'ZodString': return 'text'
    case 'ZodNumber': return 'number'
    case 'ZodBoolean': return 'checkbox'
    case 'ZodArray': return 'array'
    case 'ZodObject': return 'group'
    case 'ZodEnum': return 'select'
    default: return 'text'
  }
}

function zodToValidators(schema: ZodTypeAny, required: boolean): ValidatorFn[] {
  const validators: ValidatorFn[] = []
  const def = schema._def

  if (required) {
    validators.push((value) => {
      if (value === null || value === undefined || value === '') return 'This field is required'
      return null
    })
  }

  // Zod string checks
  for (const check of def.checks ?? []) {
    switch (check.kind) {
      case 'min':
        validators.push((v) => {
          if (typeof v !== 'string') return null
          return v.length >= Number(check.value) ? null : (check.message ?? `Minimum length is ${check.value}`)
        })
        break
      case 'max':
        validators.push((v) => {
          if (typeof v !== 'string') return null
          return v.length <= Number(check.value) ? null : (check.message ?? `Maximum length is ${check.value}`)
        })
        break
      case 'email':
        validators.push((v) => {
          if (!v) return null
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v)) ? null : (check.message ?? 'Invalid email address')
        })
        break
      case 'url':
        validators.push((v) => {
          if (!v) return null
          try { new URL(String(v)); return null } catch { return check.message ?? 'Invalid URL' }
        })
        break
      case 'regex':
        validators.push((v) => {
          if (typeof v !== 'string') return null
          const re = (check as { kind: string; regex: RegExp }).regex
          return re.test(v) ? null : (check.message ?? 'Invalid format')
        })
        break
    }
  }

  // Fallback: use zod's own safeParse for everything else
  validators.push((value) => {
    const result = schema.safeParse(value)
    if (result.success) return null
    return result.error?.errors[0]?.message ?? 'Invalid value'
  })

  return validators
}

function convertZodField(name: string, schema: ZodTypeAny): FieldDefinition {
  const typeName = zodTypeName(schema)
  const isOptional = schema.isOptional()
  const fieldType = zodToFieldType(schema)
  const label = schema._def.description ?? name

  if (typeName === 'ZodObject' && schema._def.shape) {
    const shape = schema._def.shape()
    return {
      type: 'group',
      name,
      label,
      required: !isOptional,
      fields: Object.entries(shape).map(([key, child]) =>
        convertZodField(`${name}.${key}`, child),
      ),
    }
  }

  if (typeName === 'ZodEnum' && schema._def.values) {
    const values = schema._def.values as Record<string, string>
    return {
      type: 'select',
      name,
      label,
      required: !isOptional,
      options: Object.entries(values).map(([, v]) => ({ label: v, value: v })),
      validators: zodToValidators(schema, !isOptional),
    }
  }

  return {
    type: fieldType,
    name,
    label,
    required: !isOptional,
    validators: zodToValidators(schema, !isOptional),
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function parseZod(schema: ZodTypeAny): FieldDefinition[] {
  if (schema._def.typeName !== 'ZodObject') {
    throw new Error('[vue-form-schema] parseZod expects a ZodObject schema')
  }
  const shape = schema._def.shape?.() ?? {}
  return Object.entries(shape).map(([name, field]) => convertZodField(name, field))
}
