import { watchEffect, type Ref } from 'vue'
import type { FieldDefinition } from './types'
import { getByPath, setByPath } from './ValidationEngine'

// ─── Safe string-expression evaluator ──────────────────────────────────────────
//
// `visible` / `disabled` may be given as a small JS-like expression string,
// e.g. "values.age >= 18". This is parsed and interpreted by hand below —
// no `eval` / `new Function` is used anywhere, so an expression can never run
// arbitrary code. It can only read (denylisted) properties off `values` and
// combine them with a fixed set of comparison / logical / arithmetic
// operators.

type Token =
  | { type: 'num'; value: number }
  | { type: 'str'; value: string }
  | { type: 'ident'; value: string }
  | { type: 'op'; value: string }
  | { type: 'eof' }

const OPERATORS = [
  '===',
  '!==',
  '==',
  '!=',
  '<=',
  '>=',
  '&&',
  '||',
  '(',
  ')',
  '[',
  ']',
  '.',
  '?',
  ':',
  '!',
  '<',
  '>',
  '+',
  '-',
  '*',
  '/',
  '%',
]

const FORBIDDEN_KEYS = new Set(['__proto__', 'prototype', 'constructor'])

function tokenize(src: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  while (i < src.length) {
    const ch = src[i]
    if (/\s/.test(ch)) {
      i++
      continue
    }

    if (ch === '"' || ch === "'") {
      const quote = ch
      let j = i + 1
      let value = ''
      while (j < src.length && src[j] !== quote) {
        value += src[j]
        j++
      }
      if (src[j] !== quote) throw new Error('Unterminated string literal')
      tokens.push({ type: 'str', value })
      i = j + 1
      continue
    }

    if (/[0-9]/.test(ch)) {
      let j = i
      while (j < src.length && /[0-9.]/.test(src[j])) j++
      tokens.push({ type: 'num', value: Number(src.slice(i, j)) })
      i = j
      continue
    }

    if (/[A-Za-z_$]/.test(ch)) {
      let j = i
      while (j < src.length && /[A-Za-z0-9_$]/.test(src[j])) j++
      tokens.push({ type: 'ident', value: src.slice(i, j) })
      i = j
      continue
    }

    const op = OPERATORS.find((o) => src.startsWith(o, i))
    if (op) {
      tokens.push({ type: 'op', value: op })
      i += op.length
      continue
    }

    throw new Error(`Unexpected character "${ch}"`)
  }
  tokens.push({ type: 'eof' })
  return tokens
}

/** Recursive-descent parser that evaluates directly as it parses — no AST, no eval. */
class ExpressionParser {
  private pos = 0

  constructor(
    private readonly tokens: Token[],
    private readonly values: Record<string, unknown>,
  ) {}

  parse(): unknown {
    const result = this.parseTernary()
    if (this.peek().type !== 'eof') throw new Error('Unexpected trailing tokens')
    return result
  }

  private peek(): Token {
    return this.tokens[this.pos]
  }

  private next(): Token {
    return this.tokens[this.pos++]
  }

  private isOp(value: string): boolean {
    const t = this.peek()
    return t.type === 'op' && t.value === value
  }

  private expectOp(value: string) {
    const t = this.next()
    if (t.type !== 'op' || t.value !== value) throw new Error(`Expected "${value}"`)
  }

  private parseTernary(): unknown {
    const cond = this.parseLogicalOr()
    if (this.isOp('?')) {
      this.next()
      const whenTrue = this.parseTernary()
      this.expectOp(':')
      const whenFalse = this.parseTernary()
      return cond ? whenTrue : whenFalse
    }
    return cond
  }

  private parseLogicalOr(): unknown {
    let left = this.parseLogicalAnd()
    while (this.isOp('||')) {
      this.next()
      left = left || this.parseLogicalAnd()
    }
    return left
  }

  private parseLogicalAnd(): unknown {
    let left = this.parseEquality()
    while (this.isOp('&&')) {
      this.next()
      left = left && this.parseEquality()
    }
    return left
  }

  private parseEquality(): unknown {
    let left = this.parseRelational()
    for (;;) {
      const t = this.peek()
      if (t.type !== 'op' || !['==', '!=', '===', '!=='].includes(t.value)) break
      this.next()
      const right = this.parseRelational()
      switch (t.value) {
        case '==':
          left = left == right
          break
        case '!=':
          left = left != right
          break
        case '===':
          left = left === right
          break
        case '!==':
          left = left !== right
          break
      }
    }
    return left
  }

  private parseRelational(): unknown {
    let left = this.parseAdditive()
    for (;;) {
      const t = this.peek()
      if (t.type !== 'op' || !['<=', '>=', '<', '>'].includes(t.value)) break
      this.next()
      const right = this.parseAdditive()
      switch (t.value) {
        case '<=':
          left = (left as never) <= (right as never)
          break
        case '>=':
          left = (left as never) >= (right as never)
          break
        case '<':
          left = (left as never) < (right as never)
          break
        case '>':
          left = (left as never) > (right as never)
          break
      }
    }
    return left
  }

  private parseAdditive(): unknown {
    let left = this.parseMultiplicative()
    for (;;) {
      const t = this.peek()
      if (t.type !== 'op' || !['+', '-'].includes(t.value)) break
      this.next()
      const right = this.parseMultiplicative()
      left =
        t.value === '+' ? (left as never) + (right as never) : (left as never) - (right as never)
    }
    return left
  }

  private parseMultiplicative(): unknown {
    let left = this.parseUnary()
    for (;;) {
      const t = this.peek()
      if (t.type !== 'op' || !['*', '/', '%'].includes(t.value)) break
      this.next()
      const right = this.parseUnary()
      if (t.value === '*') left = (left as never) * (right as never)
      else if (t.value === '/') left = (left as never) / (right as never)
      else left = (left as never) % (right as never)
    }
    return left
  }

  private parseUnary(): unknown {
    if (this.isOp('!')) {
      this.next()
      return !this.parseUnary()
    }
    if (this.isOp('-')) {
      this.next()
      return -(this.parseUnary() as number)
    }
    return this.parsePrimary()
  }

  private parsePrimary(): unknown {
    const t = this.next()

    if (t.type === 'num') return t.value
    if (t.type === 'str') return t.value

    if (t.type === 'ident') {
      if (t.value === 'true') return true
      if (t.value === 'false') return false
      if (t.value === 'null') return null
      if (t.value === 'undefined') return undefined
      // `values` is the only variable an expression may reference
      if (t.value !== 'values') throw new Error(`Unknown identifier "${t.value}"`)
      return this.parseMemberChain(this.values)
    }

    if (t.type === 'op' && t.value === '(') {
      const inner = this.parseTernary()
      this.expectOp(')')
      return inner
    }

    throw new Error('Unexpected token')
  }

  private parseMemberChain(root: unknown): unknown {
    let current = root
    for (;;) {
      if (this.isOp('.')) {
        this.next()
        const prop = this.next()
        if (prop.type !== 'ident') throw new Error('Expected property name')
        current = this.readProp(current, prop.value)
      } else if (this.isOp('[')) {
        this.next()
        const key = this.parseTernary()
        this.expectOp(']')
        current = this.readProp(current, String(key))
      } else {
        break
      }
    }
    return current
  }

  private readProp(obj: unknown, key: string): unknown {
    if (FORBIDDEN_KEYS.has(key)) return undefined
    if (obj === null || obj === undefined) return undefined
    if (typeof obj !== 'object') return undefined
    return (obj as Record<string, unknown>)[key]
  }
}

function evalExpression(expr: string, values: Record<string, unknown>): boolean {
  try {
    const tokens = tokenize(expr)
    return Boolean(new ExpressionParser(tokens, values).parse())
  } catch {
    console.warn(`[vue-form-schema] Invalid or unsupported expression: "${expr}"`)
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
  evaluateFields(fields: FieldDefinition[], values: Record<string, unknown>): FieldDefinition[] {
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
