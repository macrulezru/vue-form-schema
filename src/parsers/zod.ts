/**
 * Zod adapter — subentry-point 'vue-form-schema/zod'
 * Zod is a peer dependency; this file does a lazy import so the core bundle
 * is not bloated when Zod is not used.
 */

import type { FieldDefinition, TypedFieldDefinitions, ValidatorFn } from '../core/types'
import { discriminatedFields } from '../core/schemaUtils'
// Type-only import — does not pull Zod into the runtime bundle (Zod stays an
// optional peer dependency). Used solely so `parseZod`'s return type can
// carry the schema's inferred value type through to `useForm`.
import type { z } from 'zod'

// Minimal Zod type surface we need (avoid importing zod types at build time).
// All optional message fields use `string | undefined` so the type is
// compatible with exactOptionalPropertyTypes and Zod's own generated types.
type ZodTypeAny = any

// ─── Mapping helpers ──────────────────────────────────────────────────────────

function zodTypeName(schema: ZodTypeAny): string {
  let def = schema._def
  while (
    def.typeName === 'ZodOptional' ||
    def.typeName === 'ZodNullable' ||
    def.typeName === 'ZodDefault'
  ) {
    def = def.innerType?._def ?? def
    break
  }
  return def.typeName
}

function zodToFieldType(schema: ZodTypeAny): FieldDefinition['type'] {
  const name = zodTypeName(schema)
  switch (name) {
    case 'ZodString':
      return 'text'
    case 'ZodNumber':
      return 'number'
    case 'ZodBoolean':
      return 'checkbox'
    case 'ZodArray':
      return 'array'
    case 'ZodObject':
      return 'group'
    case 'ZodEnum':
      return 'select'
    default:
      return 'text'
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
          return v.length >= Number(check.value)
            ? null
            : (check.message ?? `Minimum length is ${check.value}`)
        })
        break
      case 'max':
        validators.push((v) => {
          if (typeof v !== 'string') return null
          return v.length <= Number(check.value)
            ? null
            : (check.message ?? `Maximum length is ${check.value}`)
        })
        break
      case 'email':
        validators.push((v) => {
          if (!v) return null
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v))
            ? null
            : (check.message ?? 'Invalid email address')
        })
        break
      case 'url':
        validators.push((v) => {
          if (!v) return null
          try {
            new URL(String(v))
            return null
          } catch {
            return check.message ?? 'Invalid URL'
          }
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
      fields: Object.entries(shape).map(([key, child]) => convertZodField(`${name}.${key}`, child)),
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

// ─── Discriminated unions ─────────────────────────────────────────────────────

/**
 * Converts a `z.discriminatedUnion(key, [...])` into a flat `FieldDefinition[]`:
 * a `select` field for the discriminator (options built from each variant's
 * literal discriminator value) followed by every variant's own fields, each
 * wired via `discriminatedFields` so only the fields matching the current
 * discriminator value are visible.
 */
function convertZodDiscriminatedUnion(schema: ZodTypeAny): FieldDefinition[] {
  const def = schema._def as { discriminator: string; options: ZodTypeAny[] }
  const discriminatorName = def.discriminator

  function variantKey(optionSchema: ZodTypeAny): string {
    const shape = optionSchema._def.shape?.() ?? {}
    const literal = shape[discriminatorName]
    return String(literal?._def?.value)
  }

  const discriminatorField: FieldDefinition = {
    type: 'select',
    name: discriminatorName,
    label: discriminatorName,
    required: true,
    options: def.options.map((optionSchema) => {
      const key = variantKey(optionSchema)
      return { label: key, value: key }
    }),
  }

  const variants: Record<string, FieldDefinition[]> = {}
  for (const optionSchema of def.options) {
    const shape = optionSchema._def.shape?.() ?? {}
    variants[variantKey(optionSchema)] = Object.entries(shape)
      .filter(([key]) => key !== discriminatorName)
      .map(([name, child]) => convertZodField(name, child))
  }

  return [discriminatorField, ...discriminatedFields(discriminatorName, variants)]
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Parses a `z.object({...})` schema into a `FieldDefinition[]`.
 *
 * The return type carries the schema's inferred value type (`z.infer<S>`),
 * so `useForm({ schema: parseZod(mySchema) })` picks up fully typed
 * `values`/`errors`/`onSubmit` without an explicit `useForm<Values>(...)`.
 */
export function parseZod<S extends z.ZodObject<z.ZodRawShape>>(
  schema: S,
): TypedFieldDefinitions<z.infer<S>>
/**
 * Parses a `z.discriminatedUnion(key, [...])` schema into a `FieldDefinition[]`
 * — a `select` for the discriminator plus every variant's fields, each only
 * visible while the discriminator matches its variant (see
 * `discriminatedFields`). Combine with `clearOnHide: true` on `useForm` so
 * switching variants resets the now-hidden variant's values.
 */
export function parseZod<
  Discriminator extends string,
  Options extends readonly z.ZodDiscriminatedUnionOption<Discriminator>[],
>(
  schema: z.ZodDiscriminatedUnion<Discriminator, Options>,
): TypedFieldDefinitions<z.infer<z.ZodDiscriminatedUnion<Discriminator, Options>>>
export function parseZod(schema: ZodTypeAny): TypedFieldDefinitions<unknown> {
  const zSchema = schema as ZodTypeAny

  if (zSchema._def.typeName === 'ZodDiscriminatedUnion') {
    return convertZodDiscriminatedUnion(zSchema) as TypedFieldDefinitions<unknown>
  }

  if (zSchema._def.typeName !== 'ZodObject') {
    throw new Error(
      '[vue-form-schema] parseZod expects a ZodObject or ZodDiscriminatedUnion schema',
    )
  }
  const shape = zSchema._def.shape?.() ?? {}
  return Object.entries(shape).map(([name, field]) =>
    convertZodField(name, field),
  ) as TypedFieldDefinitions<unknown>
}
