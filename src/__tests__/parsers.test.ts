import { describe, it, expect } from 'vitest'
import { parseJSON } from '../parsers/json'
import { parseZod } from '../parsers/zod'
import { parseYup } from '../parsers/yup'
import type { JSONSchema } from '../core/types'

// ─── parseJSON ────────────────────────────────────────────────────────────────

describe('parseJSON', () => {
  it('converts basic fields', () => {
    const schema: JSONSchema = [
      { type: 'text', name: 'firstName', label: 'First Name', required: true },
      { type: 'email', name: 'email', label: 'Email' },
    ]
    const fields = parseJSON(schema)
    expect(fields).toHaveLength(2)
    expect(fields[0].name).toBe('firstName')
    expect(fields[0].required).toBe(true)
    expect(fields[1].type).toBe('email')
  })

  it('converts built-in validator rules', () => {
    const schema: JSONSchema = [
      {
        type: 'text',
        name: 'username',
        validators: [
          { rule: 'minLength', value: 3, message: 'Too short' },
          { rule: 'maxLength', value: 20 },
        ],
      },
    ]
    const fields = parseJSON(schema)
    expect(fields[0].validators).toHaveLength(2)
    expect(fields[0].validators![0]('ab', {})).toBe('Too short')
    expect(fields[0].validators![1]('x'.repeat(21), {})).toBeTruthy()
  })

  it('converts email and url rules', () => {
    const schema: JSONSchema = [
      {
        type: 'email',
        name: 'contact',
        validators: [{ rule: 'email', message: 'Bad email' }, { rule: 'url' }],
      },
    ]
    const fields = parseJSON(schema)
    expect(fields[0].validators![0]('not@email', {})).toBe('Bad email')
  })

  it('converts nested group', () => {
    const schema: JSONSchema = [
      {
        type: 'group',
        name: 'address',
        fields: [{ type: 'text', name: 'address.city', label: 'City' }],
      },
    ]
    const fields = parseJSON(schema)
    expect(fields[0].fields).toHaveLength(1)
    expect(fields[0].fields![0].name).toBe('address.city')
  })

  it('handles unknown validator rule gracefully', () => {
    const schema: JSONSchema = [
      {
        type: 'text',
        name: 'x',
        validators: [{ rule: 'unknownRule' }],
      },
    ]
    expect(() => parseJSON(schema)).not.toThrow()
  })

  it('converts mask', () => {
    const schema: JSONSchema = [
      {
        type: 'text',
        name: 'phone',
        mask: { preset: 'phone-ru' },
      },
    ]
    const fields = parseJSON(schema)
    expect(fields[0].mask).toEqual({ preset: 'phone-ru' })
  })
})

// ─── parseZod ─────────────────────────────────────────────────────────────────

describe('parseZod', () => {
  it('converts ZodObject to FieldDefinition[]', async () => {
    const { z } = await import('zod')
    const schema = z.object({
      name: z.string().min(2).describe('Full Name'),
      age: z.number().min(0).optional(),
      email: z.string().email(),
    })
    const fields = parseZod(schema)
    expect(fields).toHaveLength(3)
    expect(fields[0].name).toBe('name')
    expect(fields[0].label).toBe('Full Name')
    expect(fields[0].required).toBe(true)
    expect(fields[1].required).toBe(false) // optional
    expect(fields[2].type).toBe('text')
  })

  it('throws on non-ZodObject', async () => {
    const { z } = await import('zod')
    // parseZod's generic constraint now rejects this at compile time for
    // typed callers; the runtime guard still matters for untyped/dynamic
    // input, hence the cast to bypass the type check here.
    const schema = z.string() as unknown as Parameters<typeof parseZod>[0]
    expect(() => parseZod(schema)).toThrow()
  })

  it('maps ZodBoolean to checkbox', async () => {
    const { z } = await import('zod')
    const schema = z.object({ agree: z.boolean() })
    const fields = parseZod(schema)
    expect(fields[0].type).toBe('checkbox')
  })

  it('maps ZodEnum to select', async () => {
    const { z } = await import('zod')
    const schema = z.object({ role: z.enum(['admin', 'user']) })
    const fields = parseZod(schema)
    expect(fields[0].type).toBe('select')
    expect(fields[0].options).toBeTruthy()
  })

  it('prefixes nested ZodObject sub-field names with the parent group', async () => {
    const { z } = await import('zod')
    const schema = z.object({ address: z.object({ city: z.string() }) })
    const fields = parseZod(schema)
    const addr = fields.find((f) => f.name === 'address')
    expect(addr?.type).toBe('group')
    expect(addr?.fields?.[0].name).toBe('address.city')
  })

  describe('z.discriminatedUnion() discriminated schemas', () => {
    it("produces a select discriminator plus every variant's fields", async () => {
      const { z } = await import('zod')
      const schema = z.discriminatedUnion('method', [
        z.object({ method: z.literal('card'), cardNumber: z.string() }),
        z.object({ method: z.literal('paypal'), paypalEmail: z.string().email() }),
      ])
      const fields = parseZod(schema)

      const discriminator = fields.find((f) => f.name === 'method')
      expect(discriminator?.type).toBe('select')
      expect((discriminator?.options as { value: unknown }[]).map((o) => o.value)).toEqual([
        'card',
        'paypal',
      ])

      const cardNumber = fields.find((f) => f.name === 'cardNumber')
      expect(cardNumber?.type).toBe('text')

      const resolveCard = cardNumber?.visible as (v: Record<string, unknown>) => boolean
      expect(resolveCard({ method: 'card' })).toBe(true)
      expect(resolveCard({ method: 'paypal' })).toBe(false)
    })

    it('excludes the discriminator key itself from the variant field lists', async () => {
      const { z } = await import('zod')
      const schema = z.discriminatedUnion('method', [
        z.object({ method: z.literal('card'), cardNumber: z.string() }),
      ])
      const fields = parseZod(schema)
      expect(fields.filter((f) => f.name === 'method')).toHaveLength(1)
    })
  })
})

// ─── parseYup ─────────────────────────────────────────────────────────────────

describe('parseYup', () => {
  it('converts yup object schema', async () => {
    const { object, string, number } = await import('yup')
    const schema = object({
      name: string().required().label('Name'),
      age: number().optional(),
    })
    const fields = parseYup(schema as Parameters<typeof parseYup>[0])
    expect(fields).toHaveLength(2)
    expect(fields[0].name).toBe('name')
  })

  it('throws on non-object schema', async () => {
    const { string } = await import('yup')
    expect(() => parseYup(string() as Parameters<typeof parseYup>[0])).toThrow()
  })

  it('maps nested yup object to group', async () => {
    const { object, string } = await import('yup')
    const schema = object({
      address: object({
        city: string().required(),
      }),
    })
    const fields = parseYup(schema as Parameters<typeof parseYup>[0])
    expect(fields[0].type).toBe('group')
    expect(fields[0].fields).toBeTruthy()
  })
})
