import type { FieldDefinition } from './types'

/**
 * Merge multiple schemas into one, later schemas override earlier ones
 * when field names collide.
 */
export function mergeSchemas(...schemas: FieldDefinition[][]): FieldDefinition[] {
  const map = new Map<string, FieldDefinition>()
  for (const schema of schemas) {
    for (const field of schema) {
      map.set(field.name, field)
    }
  }
  return Array.from(map.values())
}

/**
 * Return a schema without the specified field names (top-level only).
 */
export function omitFields(schema: FieldDefinition[], keys: string[]): FieldDefinition[] {
  const set = new Set(keys)
  return schema.filter((f) => !set.has(f.name))
}

/**
 * Return only the fields with the specified names, preserving original order.
 */
export function pickFields(schema: FieldDefinition[], keys: string[]): FieldDefinition[] {
  const set = new Set(keys)
  return schema.filter((f) => set.has(f.name))
}

/**
 * Return a new schema with the given field merged with `overrides`.
 * Does not mutate the original schema.
 */
export function extendField(
  schema: FieldDefinition[],
  fieldName: string,
  overrides: Partial<FieldDefinition>,
): FieldDefinition[] {
  return schema.map((f) => (f.name === fieldName ? { ...f, ...overrides } : f))
}
