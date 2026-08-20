import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, nextTick } from 'vue'
import { discriminatedFields } from '../core/schemaUtils'
import { useForm } from '../core/useForm'
import type { FieldDefinition } from '../core/types'

describe('discriminatedFields', () => {
  const variants: Record<string, FieldDefinition[]> = {
    card: [
      { type: 'text', name: 'cardNumber', label: 'Card number', required: true },
      { type: 'text', name: 'cvc', label: 'CVC', required: true },
    ],
    paypal: [{ type: 'email', name: 'paypalEmail', label: 'PayPal email', required: true }],
  }

  it('flattens every variant into a single array, preserving field order', () => {
    const fields = discriminatedFields('method', variants)
    expect(fields.map((f) => f.name)).toEqual(['cardNumber', 'cvc', 'paypalEmail'])
  })

  it('does not mutate the input field objects', () => {
    const original = variants.card[0]
    discriminatedFields('method', variants)
    expect(original.visible).toBeUndefined()
  })

  it("resolves visible to true only when the discriminator matches the field's variant", () => {
    const fields = discriminatedFields('method', variants)
    const cardNumber = fields.find((f) => f.name === 'cardNumber')!
    const paypalEmail = fields.find((f) => f.name === 'paypalEmail')!

    expect(
      (cardNumber.visible as (v: Record<string, unknown>) => boolean)({ method: 'card' }),
    ).toBe(true)
    expect(
      (cardNumber.visible as (v: Record<string, unknown>) => boolean)({ method: 'paypal' }),
    ).toBe(false)
    expect(
      (paypalEmail.visible as (v: Record<string, unknown>) => boolean)({ method: 'paypal' }),
    ).toBe(true)
    expect(
      (paypalEmail.visible as (v: Record<string, unknown>) => boolean)({ method: 'card' }),
    ).toBe(false)
  })

  it('is false when the discriminator field has no value yet', () => {
    const fields = discriminatedFields('method', variants)
    const cardNumber = fields.find((f) => f.name === 'cardNumber')!
    expect((cardNumber.visible as (v: Record<string, unknown>) => boolean)({})).toBe(false)
  })

  describe('composing with a field-level visible', () => {
    it('combines a boolean visible: false via AND (always hidden)', () => {
      const fields = discriminatedFields('method', {
        card: [{ type: 'text', name: 'cardNumber', visible: false }],
      })
      const field = fields[0]
      expect((field.visible as (v: Record<string, unknown>) => boolean)({ method: 'card' })).toBe(
        false,
      )
    })

    it('combines a function visible via AND', () => {
      const fields = discriminatedFields('method', {
        card: [
          {
            type: 'text',
            name: 'cardNumber',
            visible: (v) => v.country === 'US',
          },
        ],
      })
      const field = fields[0]
      const resolve = field.visible as (v: Record<string, unknown>) => boolean
      expect(resolve({ method: 'card', country: 'US' })).toBe(true)
      expect(resolve({ method: 'card', country: 'FR' })).toBe(false)
      // discriminator mismatch still wins even if the original condition would pass
      expect(resolve({ method: 'paypal', country: 'US' })).toBe(false)
    })

    it('combines a string-expression visible via AND', () => {
      const fields = discriminatedFields('method', {
        card: [{ type: 'text', name: 'cardNumber', visible: 'values.amount > 100' }],
      })
      const field = fields[0]
      const resolve = field.visible as (v: Record<string, unknown>) => boolean
      expect(resolve({ method: 'card', amount: 200 })).toBe(true)
      expect(resolve({ method: 'card', amount: 50 })).toBe(false)
    })
  })
})

describe('discriminatedFields — integration with useForm', () => {
  function mountForm(schema: FieldDefinition[]) {
    return mount(
      defineComponent({
        setup() {
          const form = useForm({ schema, clearOnHide: true })
          return { form }
        },
        template: '<div></div>',
      }),
    )
  }

  function schema(): FieldDefinition[] {
    return [
      {
        type: 'radio',
        name: 'method',
        options: [
          { label: 'Card', value: 'card' },
          { label: 'PayPal', value: 'paypal' },
        ],
      },
      ...discriminatedFields('method', {
        card: [{ type: 'text', name: 'cardNumber', defaultValue: '' }],
        paypal: [{ type: 'email', name: 'paypalEmail', defaultValue: '' }],
      }),
    ]
  }

  it("only the active variant's fields are visible", async () => {
    const wrapper = mountForm(schema())
    wrapper.vm.form.setField('method', 'card')
    await nextTick()
    const visible = wrapper.vm.form.fields.value
      .filter((f) => f.visible !== false)
      .map((f) => f.name)
    expect(visible).toContain('cardNumber')
    expect(visible).not.toContain('paypalEmail')
  })

  it("clearOnHide resets the previous variant's values when switching", async () => {
    const wrapper = mountForm(schema())
    wrapper.vm.form.setField('method', 'card')
    await nextTick()
    wrapper.vm.form.setField('cardNumber', '4242424242424242')
    await nextTick()
    expect(wrapper.vm.form.getField('cardNumber')).toBe('4242424242424242')

    wrapper.vm.form.setField('method', 'paypal')
    await nextTick()
    expect(wrapper.vm.form.getField('cardNumber')).toBe('')
  })
})
