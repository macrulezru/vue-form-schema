import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, nextTick } from 'vue'
import { useForm } from '../core/useForm'
import { sameAs } from '../core/ValidationEngine'
import { mergeSchemas, omitFields, pickFields, extendField } from '../core/schemaUtils'
import { defineSchema } from '../core/inferTypes'
import type { InferValues } from '../core/inferTypes'
import type { FieldDefinition } from '../core/types'

// ─── #17 sameAs ───────────────────────────────────────────────────────────────

describe('sameAs validator', () => {
  it('passes when values match', () => {
    const validator = sameAs('password')
    expect(validator('secret', { password: 'secret' })).toBeNull()
  })

  it('fails when values differ', () => {
    const validator = sameAs('password')
    expect(validator('wrong', { password: 'secret' })).toBeTruthy()
  })

  it('uses custom message', () => {
    const validator = sameAs('pass', 'Passwords must match')
    expect(validator('x', { pass: 'y' })).toBe('Passwords must match')
  })

  it('works end-to-end in useForm', async () => {
    const schema: FieldDefinition[] = [
      { type: 'text', name: 'password', required: true },
      { type: 'text', name: 'confirm', validators: [sameAs('password', 'Must match')] },
    ]
    const w = mount(defineComponent({
      setup() { return useForm({ schema, validateOn: 'input' }) },
      template: '<div/>',
    }))
    w.vm.setField('password', 'abc')
    w.vm.setField('confirm', 'xyz')
    await nextTick()
    expect(w.vm.errors['confirm']).toEqual(['Must match'])

    w.vm.setField('confirm', 'abc')
    await nextTick()
    expect(w.vm.errors['confirm'] ?? []).toHaveLength(0)
  })
})

// ─── #8 transform / parse ─────────────────────────────────────────────────────

describe('field transform', () => {
  it('trims string on setField', async () => {
    const schema: FieldDefinition[] = [{
      type: 'text',
      name: 'name',
      transform: (v) => (typeof v === 'string' ? v.trim() : v),
    }]
    const w = mount(defineComponent({
      setup() { return useForm({ schema }) },
      template: '<div/>',
    }))
    w.vm.setField('name', '  Alice  ')
    await nextTick()
    expect(w.vm.values.name).toBe('Alice')
  })

  it('coerces number string to number', async () => {
    const schema: FieldDefinition[] = [{
      type: 'number',
      name: 'age',
      transform: (v) => Number(v),
    }]
    const w = mount(defineComponent({
      setup() { return useForm({ schema }) },
      template: '<div/>',
    }))
    w.vm.setField('age', '25')
    await nextTick()
    expect(w.vm.values.age).toBe(25)
  })
})

describe('field parse (submit time)', () => {
  it('applies parse before calling onSubmit', async () => {
    const onSubmit = vi.fn()
    const schema: FieldDefinition[] = [{
      type: 'text',
      name: 'tags',
      defaultValue: 'vue,react',
      parse: (v) => String(v).split(',').map((s) => s.trim()),
    }]
    const w = mount(defineComponent({
      setup() { return useForm({ schema, onSubmit }) },
      template: '<div/>',
    }))
    await w.vm.submit()
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ tags: ['vue', 'react'] }),
    )
  })

  it('raw values ref is not mutated by parse', async () => {
    const onSubmit = vi.fn()
    const schema: FieldDefinition[] = [{
      type: 'text',
      name: 'code',
      defaultValue: 'abc',
      parse: (v) => String(v).toUpperCase(),
    }]
    const w = mount(defineComponent({
      setup() { return useForm({ schema, onSubmit }) },
      template: '<div/>',
    }))
    await w.vm.submit()
    // values.code should still be the original 'abc', not 'ABC'
    expect(w.vm.values.code).toBe('abc')
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ code: 'ABC' }))
  })
})

// ─── #18 schema composition ───────────────────────────────────────────────────

const baseSchema: FieldDefinition[] = [
  { type: 'text', name: 'firstName' },
  { type: 'text', name: 'lastName' },
  { type: 'email', name: 'email' },
]

describe('mergeSchemas', () => {
  it('combines two schemas', () => {
    const extra: FieldDefinition[] = [{ type: 'text', name: 'phone' }]
    const result = mergeSchemas(baseSchema, extra)
    expect(result.map((f) => f.name)).toEqual(['firstName', 'lastName', 'email', 'phone'])
  })

  it('later schema overrides earlier on name collision', () => {
    const override: FieldDefinition[] = [{ type: 'number', name: 'firstName' }]
    const result = mergeSchemas(baseSchema, override)
    expect(result.find((f) => f.name === 'firstName')?.type).toBe('number')
    expect(result.length).toBe(3) // no duplicates
  })
})

describe('omitFields', () => {
  it('removes specified fields', () => {
    const result = omitFields(baseSchema, ['lastName', 'email'])
    expect(result.map((f) => f.name)).toEqual(['firstName'])
  })

  it('returns full schema if no keys match', () => {
    expect(omitFields(baseSchema, ['unknown']).length).toBe(3)
  })
})

describe('pickFields', () => {
  it('keeps only specified fields', () => {
    const result = pickFields(baseSchema, ['email', 'firstName'])
    expect(result.map((f) => f.name)).toEqual(['firstName', 'email'])
  })
})

describe('extendField', () => {
  it('merges overrides into matched field', () => {
    const result = extendField(baseSchema, 'email', { required: true, label: 'Email Address' })
    const email = result.find((f) => f.name === 'email')
    expect(email?.required).toBe(true)
    expect(email?.label).toBe('Email Address')
  })

  it('does not mutate original schema', () => {
    extendField(baseSchema, 'firstName', { required: true })
    expect(baseSchema.find((f) => f.name === 'firstName')?.required).toBeUndefined()
  })
})

// ─── #12 defineSchema / InferValues ──────────────────────────────────────────

describe('defineSchema', () => {
  it('returns the same array identity', () => {
    const schema = [{ type: 'text' as const, name: 'x' as const }] as const
    const result = defineSchema(schema)
    expect(result).toBe(schema)
  })
})

// Type-level test — if this file compiles, inference works
describe('InferValues type', () => {
  it('compiles with typed useForm usage', () => {
    const schema = defineSchema([
      { type: 'text' as const, name: 'username' as const },
      { type: 'number' as const, name: 'age' as const },
      { type: 'checkbox' as const, name: 'agreed' as const },
    ] as const)

    type Values = InferValues<typeof schema>

    // Runtime check — just verify schema passes through
    expect(schema[0].name).toBe('username')

    // The type assertion below would fail to compile if inference is broken:
    const _typeCheck: Values = { username: 'alice', age: 30, agreed: true }
    expect(_typeCheck.username).toBe('alice')
  })
})
