import type { FieldDefinition, FieldType } from './types'

// ─── FieldType → value type mapping ──────────────────────────────────────────

type FieldTypeValue<T extends FieldType> =
  T extends 'checkbox' ? boolean :
  T extends 'number' ? number :
  T extends 'array' ? unknown[] :
  T extends 'group' ? Record<string, unknown> :
  string

// ─── Infer value type for a single field ─────────────────────────────────────

type InferField<F> =
  F extends { name: infer Name extends string; type: infer Type extends FieldType }
    ? { [K in Name]: FieldTypeValue<Type> }
    : never

type UnionToIntersection<U> =
  (U extends unknown ? (x: U) => void : never) extends (x: infer I) => void ? I : never

// ─── Public types ─────────────────────────────────────────────────────────────

/**
 * Infer a typed values object from a `const` schema tuple.
 *
 * @example
 * const schema = defineSchema([
 *   { type: 'text',     name: 'email' },
 *   { type: 'number',   name: 'age' },
 *   { type: 'checkbox', name: 'agreed' },
 * ] as const)
 *
 * type Values = InferValues<typeof schema>
 * // { email: string; age: number; agreed: boolean }
 *
 * const form = useForm<Values>({ schema })
 */
export type InferValues<T extends readonly FieldDefinition[]> = UnionToIntersection<
  { [K in keyof T]: InferField<T[K]> }[number]
>

/**
 * Identity helper that preserves literal types in a schema array.
 * Wrap your schema with this to enable `InferValues<typeof schema>`.
 *
 * @example
 * const schema = defineSchema([
 *   { type: 'text' as const, name: 'username' as const },
 * ])
 */
export function defineSchema<T extends readonly FieldDefinition[]>(schema: T): T {
  return schema
}
