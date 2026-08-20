import type { FieldDefinition, FieldType, FieldOption, TypedFieldDefinitions } from '../core/types'
import { discriminatedFields } from '../core/schemaUtils'
// Type-only import — does not pull Valibot into the runtime bundle (Valibot
// stays an optional peer dependency). Used solely so `parseValibot`'s return
// type can carry the schema's inferred value type through to `useForm`.
import type { GenericSchema, InferOutput } from 'valibot'

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
 *
 * The return type carries the schema's inferred value type
 * (`v.InferOutput<S>`), so `useForm({ schema: fields })` picks up fully
 * typed `values`/`errors`/`onSubmit` without an explicit `useForm<Values>(...)`.
 *
 * Also accepts a `v.variant(key, [...])` schema — converted into a `select`
 * field for the discriminator plus every variant's own fields, each only
 * visible while the discriminator matches its variant (see
 * `discriminatedFields`). Combine with `clearOnHide: true` on `useForm` so
 * switching variants resets the now-hidden variant's values.
 */
export function parseValibot<S extends GenericSchema>(
  schema: S,
): TypedFieldDefinitions<InferOutput<S>> {
  const vSchema = schema as unknown as ValibotSchema

  if (vSchema?.type === 'variant') {
    return convertValibotVariant(vSchema) as TypedFieldDefinitions<InferOutput<S>>
  }

  if (!vSchema || vSchema.type !== 'object' || !vSchema.entries) {
    throw new Error('[vue-form-schema] parseValibot expects a v.object() or v.variant() schema')
  }

  return Object.entries(vSchema.entries as Record<string, ValibotSchema>).map(([name, s]) =>
    mapField(name, s),
  ) as TypedFieldDefinitions<InferOutput<S>>
}

// ─── Discriminated variants ───────────────────────────────────────────────────

function convertValibotVariant(schema: ValibotSchema): FieldDefinition[] {
  const discriminatorName = schema.key as string
  const options = schema.options as ValibotSchema[]

  function variantKey(optionSchema: ValibotSchema): string {
    const entries = (optionSchema.entries ?? {}) as Record<string, ValibotSchema>
    return String(entries[discriminatorName]?.literal)
  }

  const discriminatorField: FieldDefinition = {
    type: 'select',
    name: discriminatorName,
    label: discriminatorName,
    required: true,
    options: options.map((optionSchema) => {
      const key = variantKey(optionSchema)
      return { label: key, value: key }
    }),
  }

  const variants: Record<string, FieldDefinition[]> = {}
  for (const optionSchema of options) {
    const entries = (optionSchema.entries ?? {}) as Record<string, ValibotSchema>
    variants[variantKey(optionSchema)] = Object.entries(entries)
      .filter(([key]) => key !== discriminatorName)
      .map(([name, child]) => mapField(name, child))
  }

  return [discriminatorField, ...discriminatedFields(discriminatorName, variants)]
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

  // Nested fields for group — prefixed with the parent's name ("address.city"),
  // matching parseZod/parseYup and the "group" field convention throughout
  // the library (getByPath/setByPath, buildInitialValues, FormRenderer's
  // recursive group rendering all expect nested sub-field names to already
  // be the full dotted path, unlike "array" fields, which use bare names
  // that useFieldArray prefixes itself).
  if (type === 'group' && inner.entries) {
    field.fields = Object.entries(inner.entries as Record<string, ValibotSchema>).map(([n, s]) =>
      mapField(`${name}.${n}`, s),
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
    case 'string':
      return 'text'
    case 'number':
      return 'number'
    case 'boolean':
      return 'checkbox'
    case 'picklist':
    case 'enum':
      return 'select'
    case 'array':
      return 'array'
    case 'object':
      return 'group'
    default:
      return 'text'
  }
}
