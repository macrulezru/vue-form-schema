import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  required,
  minLength,
  maxLength,
  min,
  max,
  pattern,
  email,
  url,
  ValidationEngine,
  getByPath,
  setByPath,
} from '../core/ValidationEngine'
import type { FieldDefinition } from '../core/types'

// ─── Built-in validators ──────────────────────────────────────────────────────

describe('required', () => {
  it('returns error for empty string', () => expect(required('', {})).toBeTruthy())
  it('returns error for null', () => expect(required(null, {})).toBeTruthy())
  it('returns error for undefined', () => expect(required(undefined, {})).toBeTruthy())
  it('returns error for empty array', () => expect(required([], {})).toBeTruthy())
  it('returns null for non-empty value', () => expect(required('hello', {})).toBeNull())
  it('returns null for 0', () => expect(required(0, {})).toBeNull())
  it('returns null for false', () => expect(required(false, {})).toBeNull())
})

describe('minLength', () => {
  it('passes when length >= min', () => expect(minLength(3)('abc', {})).toBeNull())
  it('fails when length < min', () => expect(minLength(3)('ab', {})).toBeTruthy())
  it('uses custom message', () => expect(minLength(3, 'Too short')('x', {})).toBe('Too short'))
  it('passes for arrays', () => expect(minLength(2)(['a', 'b'], {})).toBeNull())
  it('ignores non-string/array', () => expect(minLength(3)(42, {})).toBeNull())
})

describe('maxLength', () => {
  it('passes when length <= max', () => expect(maxLength(5)('hello', {})).toBeNull())
  it('fails when length > max', () => expect(maxLength(3)('hello', {})).toBeTruthy())
})

describe('min', () => {
  it('passes when value >= min', () => expect(min(5)(5, {})).toBeNull())
  it('fails when value < min', () => expect(min(5)(4, {})).toBeTruthy())
  it('ignores non-numeric', () => expect(min(5)('text', {})).toBeNull())
})

describe('max', () => {
  it('passes when value <= max', () => expect(max(10)(10, {})).toBeNull())
  it('fails when value > max', () => expect(max(10)(11, {})).toBeTruthy())
})

describe('pattern', () => {
  it('passes matching value', () => expect(pattern(/^\d+$/)('123', {})).toBeNull())
  it('fails non-matching value', () => expect(pattern(/^\d+$/)('abc', {})).toBeTruthy())
  it('ignores non-string', () => expect(pattern(/^\d+$/)(42, {})).toBeNull())
})

describe('email', () => {
  it('passes valid email', () => expect(email('test@example.com', {})).toBeNull())
  it('fails invalid email', () => expect(email('not-email', {})).toBeTruthy())
  it('passes for empty string (optional)', () => expect(email('', {})).toBeNull())
})

describe('url', () => {
  it('passes valid URL', () => expect(url('https://example.com', {})).toBeNull())
  it('fails invalid URL', () => expect(url('not-url', {})).toBeTruthy())
  it('passes empty (optional)', () => expect(url('', {})).toBeNull())
})

// ─── ValidationEngine ─────────────────────────────────────────────────────────

describe('ValidationEngine', () => {
  let engine: ValidationEngine

  beforeEach(() => { engine = new ValidationEngine(0) })
  afterEach(() => engine.destroy())

  describe('validateField', () => {
    it('returns empty array for valid field', () => {
      const field: FieldDefinition = { type: 'text', name: 'name', required: true }
      expect(engine.validateField(field, 'John', {})).toEqual([])
    })

    it('returns errors for required + custom validators', () => {
      const field: FieldDefinition = {
        type: 'text',
        name: 'age',
        required: true,
        validators: [(v) => (Number(v) < 18 ? 'Must be 18+' : null)],
      }
      const errors = engine.validateField(field, 15, {})
      expect(errors).toHaveLength(1)
      expect(errors[0]).toBe('Must be 18+')
    })

    it('collects multiple errors', () => {
      const field: FieldDefinition = {
        type: 'text',
        name: 'email',
        validators: [email, (v) => (String(v).length < 5 ? 'Too short' : null)],
      }
      const errors = engine.validateField(field, 'x', {})
      expect(errors.length).toBeGreaterThan(0)
    })
  })

  describe('validateAll', () => {
    it('returns errors for all fields', () => {
      const fields: FieldDefinition[] = [
        { type: 'text', name: 'name', required: true },
        { type: 'email', name: 'email', validators: [email] },
      ]
      const errors = engine.validateAll(fields, { name: '', email: 'bad' })
      expect(errors['name']).toBeTruthy()
      expect(errors['email']).toBeTruthy()
    })

    it('handles nested group fields', () => {
      const fields: FieldDefinition[] = [{
        type: 'group',
        name: 'address',
        fields: [{ type: 'text', name: 'address.city', required: true }],
      }]
      const errors = engine.validateAll(fields, { 'address.city': '' })
      expect(errors['address.city']).toBeTruthy()
    })
  })

  describe('validateAsync', () => {
    it('calls onResult with async errors', async () => {
      const field: FieldDefinition = {
        type: 'text',
        name: 'username',
        asyncValidators: [async (v) => v === 'taken' ? 'Username taken' : null],
      }
      const onResult = vi.fn()
      engine.validateAsync(field, 'taken', {}, onResult)
      await new Promise((r) => setTimeout(r, 50))
      expect(onResult).toHaveBeenCalledWith('username', ['Username taken'])
    })

    it('debounces multiple calls', async () => {
      const asyncFn = vi.fn(async () => null)
      const field: FieldDefinition = {
        type: 'text',
        name: 'test',
        asyncValidators: [asyncFn],
      }
      const onResult = vi.fn()
      engine.validateAsync(field, 'a', {}, onResult)
      engine.validateAsync(field, 'ab', {}, onResult)
      engine.validateAsync(field, 'abc', {}, onResult)
      await new Promise((r) => setTimeout(r, 50))
      expect(asyncFn).toHaveBeenCalledTimes(1)
    })
  })
})

// ─── Path helpers ─────────────────────────────────────────────────────────────

describe('getByPath', () => {
  it('gets top-level value', () => expect(getByPath({ a: 1 }, 'a')).toBe(1))
  it('gets nested value', () => expect(getByPath({ a: { b: 2 } }, 'a.b')).toBe(2))
  it('returns undefined for missing path', () => expect(getByPath({}, 'a.b')).toBeUndefined())
})

describe('setByPath', () => {
  it('sets top-level value immutably', () => {
    const obj = { a: 1 }
    const result = setByPath(obj, 'a', 2)
    expect(result.a).toBe(2)
    expect(obj.a).toBe(1)
  })

  it('sets nested value', () => {
    const result = setByPath({}, 'a.b.c', 42)
    expect((result.a as Record<string, unknown>)['b']).toEqual({ c: 42 })
  })
})
