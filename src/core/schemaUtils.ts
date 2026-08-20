import type { FieldDefinition } from './types'
import { evaluateFieldConditions } from './ConditionEvaluator'

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

/**
 * Builds a schema fragment whose fields switch entirely based on another
 * field's ("discriminator") current value — the common "payment method" /
 * "address type" / "document type" pattern, where each option has a wholly
 * different set of fields, instead of one flat list where every field's
 * `visible` is hand-wired individually.
 *
 * Every field in every variant gets `visible` set to "the discriminator's
 * value matches this variant" — combined with the field's own `visible`
 * (if it already has one) via AND, so a field can still be conditionally
 * hidden within its variant for other reasons.
 *
 * Doesn't create the discriminator field itself — define that separately
 * (typically a `select`/`radio` with one option per variant key) and
 * spread this helper's result alongside it. Combine with `clearOnHide: true`
 * on `useForm` so switching variants resets the now-hidden variant's values.
 *
 * @example
 * const schema: FieldDefinition[] = [
 *   {
 *     type: 'radio',
 *     name: 'paymentMethod',
 *     label: 'Payment method',
 *     options: [
 *       { label: 'Card', value: 'card' },
 *       { label: 'PayPal', value: 'paypal' },
 *     ],
 *   },
 *   ...discriminatedFields('paymentMethod', {
 *     card: [
 *       { type: 'text', name: 'cardNumber', label: 'Card number', required: true },
 *       { type: 'text', name: 'cvc', label: 'CVC', required: true },
 *     ],
 *     paypal: [{ type: 'email', name: 'paypalEmail', label: 'PayPal email', required: true }],
 *   }),
 * ]
 */
export function discriminatedFields<K extends string>(
  discriminatorName: string,
  variants: Record<K, FieldDefinition[]>,
): FieldDefinition[] {
  const result: FieldDefinition[] = []
  for (const [variantKey, fields] of Object.entries(variants) as [K, FieldDefinition[]][]) {
    for (const field of fields) {
      result.push({
        ...field,
        visible: composeVisible(field.visible, discriminatorName, variantKey),
      })
    }
  }
  return result
}

function composeVisible(
  original: FieldDefinition['visible'],
  discriminatorName: string,
  variantKey: string,
): (values: Record<string, unknown>) => boolean {
  return (values: Record<string, unknown>) => {
    if (values[discriminatorName] !== variantKey) return false
    if (original === undefined) return true
    // Reuse the same visible-resolution semantics (boolean / string
    // expression / function) as the core ConditionEvaluator instead of
    // duplicating that logic here — the "probe" field only exists to hand
    // `original` to it and read back the resolved boolean.
    const [resolved] = evaluateFieldConditions(
      [{ type: 'text', name: '__discriminatedFields_probe__', visible: original }],
      values,
    )
    return resolved.visible === true
  }
}
