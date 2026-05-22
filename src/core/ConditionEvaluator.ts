import { watchEffect, type Ref } from 'vue'
import type { FieldDefinition } from './types'
import { getByPath, setByPath } from './ValidationEngine'

// ─── Allowed operators for string expression evaluation ───────────────────────

const ALLOWED_EXPR = /^[\w\s\d.'"[\]()!<>=&|?:+\-*/%]+$/

function evalExpression(expr: string, values: Record<string, unknown>): boolean {
  if (!ALLOWED_EXPR.test(expr)) {
    console.warn(`[vue-form-schema] Blocked unsafe expression: "${expr}"`)
    return true
  }
  try {
    // eslint-disable-next-line no-new-func
    return Boolean(new Function('values', `"use strict"; return (${expr})`)(values))
  } catch {
    return true
  }
}

// ─── ConditionEvaluator ───────────────────────────────────────────────────────

export class ConditionEvaluator {
  private stopHandle: (() => void) | null = null

  /**
   * Start reactively watching values and writing evaluated fields into
   * `resolvedFields`. Also handles clearOnHide side effect.
   */
  start(
    rawFields: FieldDefinition[],
    values: Ref<Record<string, unknown>>,
    resolvedFields: Ref<FieldDefinition[]>,
    clearOnHide: boolean,
  ) {
    this.stopHandle = watchEffect(() => {
      const v = values.value
      const prev = resolvedFields.value

      const evaluated = this.evaluateFields(rawFields, v)

      if (clearOnHide) {
        this.clearHiddenValues(rawFields, evaluated, v, values, prev)
      }

      resolvedFields.value = evaluated
    })
  }

  stop() {
    this.stopHandle?.()
    this.stopHandle = null
  }

  /** Recursively evaluate visible/disabled/options for each field */
  evaluateFields(
    fields: FieldDefinition[],
    values: Record<string, unknown>,
  ): FieldDefinition[] {
    return fields.map((field) => {
      const visible = this.resolveBoolean(field.visible, values, true)
      const disabled = this.resolveBoolean(field.disabled, values, false)
      // Async options functions are handled by useForm — return undefined here so
      // the async cache value (merged later) takes precedence.
      let options: FieldDefinition['options']
      if (typeof field.options === 'function') {
        const result = field.options(values)
        options = result instanceof Promise ? undefined : result
      } else {
        options = field.options
      }

      const resolved: FieldDefinition = {
        ...field,
        visible,
        disabled,
        options,
        fields: field.fields ? this.evaluateFields(field.fields, values) : undefined,
      }

      return resolved
    })
  }

  private resolveBoolean(
    condition: boolean | string | ((values: Record<string, unknown>) => boolean) | undefined,
    values: Record<string, unknown>,
    defaultValue: boolean,
  ): boolean {
    if (condition === undefined) return defaultValue
    if (typeof condition === 'boolean') return condition
    if (typeof condition === 'function') return condition(values)
    if (typeof condition === 'string') return evalExpression(condition, values)
    return defaultValue
  }

  private clearHiddenValues(
    rawFields: FieldDefinition[],
    evaluatedFields: FieldDefinition[],
    currentValues: Record<string, unknown>,
    valuesRef: Ref<Record<string, unknown>>,
    prevFields: FieldDefinition[],
  ) {
    for (let i = 0; i < rawFields.length; i++) {
      const raw = rawFields[i]
      const evaluated = evaluatedFields[i]
      const wasVisible = this.wasVisible(prevFields, raw.name)
      const isVisible = evaluated.visible as boolean

      if (wasVisible && !isVisible) {
        const current = getByPath(currentValues, raw.name)
        const def = raw.defaultValue ?? null
        if (current !== def) {
          valuesRef.value = setByPath(valuesRef.value, raw.name, def)
        }
      }

      if (raw.fields && evaluated.fields) {
        this.clearHiddenValues(raw.fields, evaluated.fields, currentValues, valuesRef, prevFields)
      }
    }
  }

  private wasVisible(fields: FieldDefinition[], name: string): boolean {
    const f = fields.find((x) => x.name === name)
    if (!f) return true
    return f.visible !== false
  }
}

// ─── Standalone helper (for SSR) ─────────────────────────────────────────────

export function evaluateFieldConditions(
  fields: FieldDefinition[],
  values: Record<string, unknown>,
): FieldDefinition[] {
  const evaluator = new ConditionEvaluator()
  return evaluator.evaluateFields(fields, values)
}
