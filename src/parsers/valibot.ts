import type { FieldDefinition, FieldType, FieldOption } from '../core/types'

// Using `any` to avoid build-time Valibot import (peer dependency is optional)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ValibotSchema = any

/**
 * Convert a Valibot `v.object(...)` schema into a `FieldDefinition[]`.
 *
 * Supported field types: string → text, number, boolean → checkbox,
 * picklist/enum → select, array, object → group.
 * `v.optional()` / `v.nullable()` wrappers set `required: false`.
 * `v.pipe(v.string(), v.email())` sets `type: 'email'`.
 *
 * @example
 * import * as v from 'valibot'
 * import { parseValibot } from '@macrulez/vue-form-schema/valibot'
 *
 * const schema = v.object({ email: v.pipe(v.string(), v.email()), age: v.number() })
 * const fields = parseValibot(schema)
 */
export function parseValibot(schema: ValibotSchema): FieldDefinition[] {
  if (!schema || schema.type !== 'object' || !schema.entries) {
    throw new Error('[vue-form-schema] parseValibot expects a v.object() schema')
  }

  return Object.entries(schema.entries as Record<string, ValibotSchema>).map(
    ([name, s]) => mapField(name, s),
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapField(name: string, schema: ValibotSchema): FieldDefinition {
  let required = true
  let inner = schema

  // Unwrap optional / nullable / nullish
  if (inner.type === 'optional' || inner.type === 'nullable' || inner.type === 'nullish') {
    required = false
    inner = inner.wrapped ?? inner
  }

  const type = resolveType(inner)
  const field: FieldDefinition = { type, name, required }

  // Options for select (picklist / enum)
  if (type === 'select') {
    field.options = (inner.options as (string | number)[]).map((v) => ({
      label: String(v),
      value: v,
    })) as FieldOption[]
  }

  // Nested fields for group
  if (type === 'group' && inner.entries) {
    field.fields = Object.entries(inner.entries as Record<string, ValibotSchema>).map(
      ([n, s]) => mapField(n, s),
    )
  }

  return field
}

function resolveType(schema: ValibotSchema): FieldType {
  const baseType = schema.type as string

  // v.pipe() attaches a `pipe` array to the base schema; check for email validation
  if (baseType === 'string' && Array.isArray(schema.pipe)) {
    const hasEmail = schema.pipe.some((s: ValibotSchema) => s.type === 'email')
    if (hasEmail) return 'email'
  }

  switch (baseType) {
    case 'string':   return 'text'
    case 'number':   return 'number'
    case 'boolean':  return 'checkbox'
    case 'picklist':
    case 'enum':     return 'select'
    case 'array':    return 'array'
    case 'object':   return 'group'
    default:         return 'text'
  }
}
