/**
 * Standard JSON Schema (draft-07 / 2020-12 subset) and OpenAPI adapter —
 * subentry-point 'vue-form-schema/openapi'.
 *
 * Unlike `parseJSON` (this library's own simplified flat format), this
 * accepts a real JSON Schema object — the kind your backend already emits
 * via OpenAPI/Swagger — and maps it to `FieldDefinition[]`.
 *
 * Supported subset (deliberately not the full spec):
 * - `type`: 'object' | 'string' | 'number' | 'integer' | 'boolean' | 'array'
 *   (also a `type` array like `['string', 'null']` — the first non-'null'
 *   entry wins)
 * - `properties` + `required` (object schemas)
 * - `items` (array schemas — when `items` is itself an object schema with
 *   `properties`, its properties become the array field's row `fields`,
 *   using bare names as `useFieldArray` expects — see README)
 * - `enum` / `const` → `select` field with options built from the values
 * - `format`: 'email' → `type: 'email'`; 'date' / 'date-time' → `type:
 *   'date'`; 'uri' / 'url' → adds the `url` validator
 * - `minLength` / `maxLength` / `minimum` / `maximum` / `pattern`
 * - `$ref` — local JSON pointers only (`#/...`), resolved against the
 *   document passed as `rootDocument` (or the schema itself if omitted)
 *
 * Not supported: `oneOf` / `anyOf` / `allOf`, `additionalProperties`,
 * `patternProperties`, remote/external `$ref`, `exclusiveMinimum` /
 * `exclusiveMaximum` as separate keywords, tuple-form `items` (array of
 * schemas). Properties using any of these are mapped as a plain `text`
 * field with no extra validation rather than throwing — the schema still
 * parses, just without that particular constraint.
 */

import type { FieldDefinition, FieldType, TypedFieldDefinitions, ValidatorFn } from '../core/types'
import {
  required,
  minLength,
  maxLength,
  min,
  max,
  pattern as patternValidator,
  email,
  url,
} from '../core/ValidationEngine'

// ─── Public schema types ────────────────────────────────────────────────────

/** A JSON Schema object — the subset this adapter understands. */
export interface JSONSchemaObject {
  type?: string | readonly string[]
  properties?: Record<string, JSONSchemaObject>
  required?: readonly string[]
  items?: JSONSchemaObject
  enum?: readonly unknown[]
  const?: unknown
  format?: string
  title?: string
  description?: string
  minLength?: number
  maxLength?: number
  minimum?: number
  maximum?: number
  pattern?: string
  default?: unknown
  $ref?: string
  // Allows arbitrary extra JSON Schema / OpenAPI keywords without widening
  // the whole type to `any` — they're simply ignored by this adapter.
  [key: string]: unknown
}

/** A full JSON Schema or OpenAPI document — used as the `$ref` resolution root. */
export type JSONSchemaDocument = Record<string, unknown>

// ─── TypeScript inference ───────────────────────────────────────────────────

type InferProperty<S> = S extends { enum: readonly (infer E)[] }
  ? E
  : S extends { const: infer C }
    ? C
    : S extends { $ref: string }
      ? unknown // $ref'd properties resolve correctly at runtime; not inferable at the type level without a full pointer resolver
      : S extends { type: 'string' }
        ? string
        : S extends { type: 'number' | 'integer' }
          ? number
          : S extends { type: 'boolean' }
            ? boolean
            : S extends { type: 'array'; items: infer I }
              ? InferProperty<I>[]
              : S extends { type: 'object' }
                ? InferObject<S>
                : unknown

type RequiredKeys<S> = S extends { required: readonly (infer K)[] } ? K & string : never

type InferObject<S> = S extends { properties: infer P extends Record<string, unknown> }
  ? { [K in keyof P as K extends RequiredKeys<S> ? K : never]: InferProperty<P[K]> } & {
      [K in keyof P as K extends RequiredKeys<S> ? never : K]?: InferProperty<P[K]>
    }
  : Record<string, unknown>

/** Infers a values type from a JSON Schema object literal (best-effort — see module docs for the supported subset). */
export type InferJSONSchema<S> = InferObject<S>

// ─── $ref resolution ────────────────────────────────────────────────────────

function resolvePointer(doc: JSONSchemaDocument, ref: string): JSONSchemaObject {
  if (!ref.startsWith('#/')) {
    throw new Error(
      `[vue-form-schema] Only local JSON pointers ("#/...") are supported, got "${ref}"`,
    )
  }
  const parts = ref
    .slice(2)
    .split('/')
    .map((p) => decodeURIComponent(p).replace(/~1/g, '/').replace(/~0/g, '~'))

  let current: unknown = doc
  for (const part of parts) {
    if (current === null || typeof current !== 'object') {
      throw new Error(`[vue-form-schema] Could not resolve JSON pointer "${ref}"`)
    }
    current = (current as Record<string, unknown>)[part]
  }
  if (current === null || typeof current !== 'object') {
    throw new Error(`[vue-form-schema] Could not resolve JSON pointer "${ref}"`)
  }
  return current as JSONSchemaObject
}

function resolveSchema(schema: JSONSchemaObject, root: JSONSchemaDocument): JSONSchemaObject {
  return schema.$ref ? resolveSchema(resolvePointer(root, schema.$ref), root) : schema
}

// ─── Type / validator mapping ───────────────────────────────────────────────

function normalizeType(type: JSONSchemaObject['type']): string | undefined {
  if (Array.isArray(type)) return type.find((t) => t !== 'null') ?? type[0]
  return type as string | undefined
}

function schemaToFieldType(schema: JSONSchemaObject): FieldType {
  if (schema.enum || schema.const !== undefined) return 'select'
  switch (normalizeType(schema.type)) {
    case 'string':
      if (schema.format === 'email') return 'email'
      if (schema.format === 'date' || schema.format === 'date-time') return 'date'
      return 'text'
    case 'number':
    case 'integer':
      return 'number'
    case 'boolean':
      return 'checkbox'
    case 'array':
      return 'array'
    case 'object':
      return 'group'
    default:
      return 'text'
  }
}

function schemaToValidators(schema: JSONSchemaObject, isRequired: boolean): ValidatorFn[] {
  const validators: ValidatorFn[] = []
  if (isRequired) validators.push(required)
  if (typeof schema.minLength === 'number') validators.push(minLength(schema.minLength))
  if (typeof schema.maxLength === 'number') validators.push(maxLength(schema.maxLength))
  if (typeof schema.minimum === 'number') validators.push(min(schema.minimum))
  if (typeof schema.maximum === 'number') validators.push(max(schema.maximum))
  if (schema.pattern) validators.push(patternValidator(new RegExp(schema.pattern)))
  if (schema.format === 'email') validators.push(email)
  if (schema.format === 'uri' || schema.format === 'url') validators.push(url)
  return validators
}

// ─── Recursive conversion ────────────────────────────────────────────────────

/**
 * @param namePrefix Prefix for nested `group` fields ("parent.child", per
 * the `type: 'group'` convention) — `undefined` for array-item fields,
 * which use bare names because `useFieldArray` prefixes them itself.
 */
function convertProperties(
  schema: JSONSchemaObject,
  namePrefix: string | undefined,
  root: JSONSchemaDocument,
): FieldDefinition[] {
  const properties = schema.properties ?? {}
  const requiredSet = new Set(schema.required ?? [])
  return Object.entries(properties).map(([key, rawChild]) => {
    const name = namePrefix ? `${namePrefix}.${key}` : key
    return convertProperty(name, rawChild, requiredSet.has(key), root)
  })
}

function convertProperty(
  name: string,
  rawSchema: JSONSchemaObject,
  isRequired: boolean,
  root: JSONSchemaDocument,
): FieldDefinition {
  const schema = resolveSchema(rawSchema, root)
  const fieldType = schemaToFieldType(schema)
  const label = schema.title ?? name

  if (fieldType === 'select') {
    const values = schema.enum ?? [schema.const]
    return {
      type: 'select',
      name,
      label,
      required: isRequired,
      defaultValue: schema.default,
      options: values.map((v) => ({ label: String(v), value: v })),
      validators: schemaToValidators(schema, isRequired),
    }
  }

  if (fieldType === 'group') {
    return {
      type: 'group',
      name,
      label,
      required: isRequired,
      fields: schema.properties ? convertProperties(schema, name, root) : undefined,
    }
  }

  if (fieldType === 'array') {
    const itemsSchema = schema.items ? resolveSchema(schema.items, root) : undefined
    const fields =
      itemsSchema && normalizeType(itemsSchema.type) === 'object' && itemsSchema.properties
        ? convertProperties(itemsSchema, undefined, root)
        : undefined
    return {
      type: 'array',
      name,
      label,
      required: isRequired,
      defaultValue: schema.default,
      fields,
    }
  }

  return {
    type: fieldType,
    name,
    label,
    required: isRequired,
    defaultValue: schema.default,
    validators: schemaToValidators(schema, isRequired),
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Parses a JSON Schema object (`{ type: 'object', properties: {...} }`) into
 * a `FieldDefinition[]`.
 *
 * `$ref`s inside `schema` are resolved against `rootDocument` if given
 * (needed when `schema` is a sub-schema extracted from a larger document,
 * e.g. `document.components.schemas.User`), otherwise against `schema`
 * itself (self-contained schemas with their own `$defs`/`definitions`).
 *
 * The return type carries a best-effort inferred value type — see the
 * module docs for what is and isn't inferable.
 *
 * @example
 * const schema = {
 *   type: 'object',
 *   properties: {
 *     name: { type: 'string', minLength: 2 },
 *     age: { type: 'integer', minimum: 0 },
 *     role: { type: 'string', enum: ['admin', 'user'] },
 *   },
 *   required: ['name', 'role'],
 * } as const
 *
 * const fields = parseJSONSchema(schema)
 * const { values } = useForm({ schema: fields })
 */
export function parseJSONSchema<const S extends JSONSchemaObject>(
  schema: S,
  rootDocument?: JSONSchemaDocument,
): TypedFieldDefinitions<InferJSONSchema<S>> {
  const root = rootDocument ?? (schema as JSONSchemaDocument)
  const resolved = resolveSchema(schema, root)
  const type = normalizeType(resolved.type)
  if (type !== undefined && type !== 'object') {
    throw new Error('[vue-form-schema] parseJSONSchema expects an object schema (type: "object")')
  }
  if (!resolved.properties) {
    throw new Error('[vue-form-schema] parseJSONSchema expects a schema with "properties"')
  }
  return convertProperties(resolved, undefined, root) as TypedFieldDefinitions<InferJSONSchema<S>>
}

/** Selects a schema by local JSON pointer, e.g. `'#/components/schemas/User'`. */
export type OpenAPISchemaSelector = string

/** Selects an operation's JSON request body schema. */
export interface OpenAPIRequestBodySelector {
  path: string
  /** @default 'post' */
  method?: string
  /** @default 'application/json' */
  contentType?: string
}

function resolveRequestBodySchema(
  document: JSONSchemaDocument,
  selector: OpenAPIRequestBodySelector,
): JSONSchemaObject {
  const method = (selector.method ?? 'post').toLowerCase()
  const contentType = selector.contentType ?? 'application/json'

  const paths = document.paths as Record<string, unknown> | undefined
  const pathItem = paths?.[selector.path] as Record<string, unknown> | undefined
  const operation = pathItem?.[method] as Record<string, unknown> | undefined
  const requestBody = operation?.requestBody as Record<string, unknown> | undefined
  const content = requestBody?.content as Record<string, unknown> | undefined
  const mediaType = content?.[contentType] as Record<string, unknown> | undefined
  const schema = mediaType?.schema as JSONSchemaObject | undefined

  if (!schema) {
    throw new Error(
      `[vue-form-schema] Could not find a request body schema for ${method.toUpperCase()} "${selector.path}" (${contentType})`,
    )
  }
  return schema
}

/**
 * Parses a schema out of a full OpenAPI document, either by JSON pointer
 * (`'#/components/schemas/User'`) or by selecting an operation's JSON
 * request body (`{ path: '/users', method: 'post' }`).
 *
 * Unlike `parseJSONSchema`, the extracted schema's shape isn't known
 * statically, so the inferred value type defaults to
 * `Record<string, unknown>` — pass an explicit type argument if you already
 * have one generated from the OpenAPI document (e.g. via `openapi-typescript`):
 * `parseOpenAPI<CreateUserRequest>(document, '#/components/schemas/User')`.
 *
 * @example
 * const fields = parseOpenAPI(openapiDocument, '#/components/schemas/User')
 * // or, straight from an operation's request body:
 * const fields2 = parseOpenAPI(openapiDocument, { path: '/users', method: 'post' })
 */
export function parseOpenAPI<T extends Record<string, unknown> = Record<string, unknown>>(
  document: JSONSchemaDocument,
  selector: OpenAPISchemaSelector | OpenAPIRequestBodySelector,
): TypedFieldDefinitions<T> {
  const schema =
    typeof selector === 'string'
      ? resolvePointer(document, selector)
      : resolveRequestBodySchema(document, selector)
  return parseJSONSchema(schema, document) as TypedFieldDefinitions<T>
}
