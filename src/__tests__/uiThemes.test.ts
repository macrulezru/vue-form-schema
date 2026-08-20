import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import PrimeVue from 'primevue/config'
import { useForm } from '../core/useForm'
import type { FieldDefinition } from '../core/types'
import { ShadcnFormRenderer } from '../ui/shadcn'
import { PrimeVueFormRenderer } from '../ui/primevue'
import { NaiveFormRenderer } from '../ui/naive'

// Smoke tests for the three real third-party UI theme integrations
// (shadcn-styled Tailwind markup, PrimeVue, Naive UI). Unlike the BEM/
// Tailwind themes (plain HTML, no test coverage needed), these wrap real
// npm component libraries with their own event/prop contracts — worth a
// mount-and-interact check to catch wrong prop/event names that only a
// runtime render would surface (vue-tsc catches type mismatches, not
// "wired to the wrong event entirely").

const schema: FieldDefinition[] = [
  { type: 'text', name: 'name', label: 'Name', required: true },
  { type: 'email', name: 'email', label: 'Email' },
  { type: 'number', name: 'age', label: 'Age' },
  { type: 'textarea', name: 'bio', label: 'Bio' },
  {
    type: 'select',
    name: 'role',
    label: 'Role',
    options: [
      { label: 'Admin', value: 'admin' },
      { label: 'User', value: 'user' },
    ],
  },
  { type: 'checkbox', name: 'agreed', label: 'I agree' },
  {
    type: 'radio',
    name: 'plan',
    label: 'Plan',
    options: [
      { label: 'Free', value: 'free' },
      { label: 'Pro', value: 'pro' },
    ],
  },
  { type: 'date', name: 'birthDate', label: 'Birth date' },
  { type: 'file', name: 'avatar', label: 'Avatar' },
  {
    type: 'group',
    name: 'address',
    label: 'Address',
    fields: [{ type: 'text', name: 'address.city', label: 'City' }],
  },
  {
    type: 'array',
    name: 'members',
    label: 'Members',
    fields: [{ type: 'text', name: 'name', label: 'Name' }],
  },
]

function mountWithRenderer(renderer: unknown, options: Parameters<typeof mount>[1] = {}) {
  return mount(
    defineComponent({
      setup() {
        const form = useForm({ schema, initialValues: { members: [{ name: '' }] } })
        return () => h(renderer as never, { form })
      },
    }),
    options,
  )
}

describe('ShadcnFormRenderer', () => {
  it('renders every field type without throwing', () => {
    const wrapper = mountWithRenderer(ShadcnFormRenderer)
    expect(wrapper.find('form').exists()).toBe(true)
    expect(wrapper.find('input[name="name"]').exists()).toBe(true)
    expect(wrapper.find('select[name="role"]').exists()).toBe(true)
  })

  it('typing into a text field updates form values', async () => {
    const wrapper = mount(
      defineComponent({
        setup() {
          const form = useForm({ schema, initialValues: { members: [{ name: '' }] } })
          return { form }
        },
        render() {
          return h(ShadcnFormRenderer, { form: this.form })
        },
      }),
    )
    await wrapper.find('input[name="name"]').setValue('Alice')
    expect(
      (wrapper.vm as unknown as { form: ReturnType<typeof useForm> }).form.values.value.name,
    ).toBe('Alice')
  })
})

describe('PrimeVueFormRenderer', () => {
  const globalOpts = { global: { plugins: [PrimeVue] } }

  it('renders every field type without throwing', () => {
    const wrapper = mountWithRenderer(PrimeVueFormRenderer, globalOpts)
    expect(wrapper.find('form').exists()).toBe(true)
    expect(wrapper.find('input[name="name"]').exists()).toBe(true)
  })
})

describe('NaiveFormRenderer', () => {
  it('renders every field type without throwing', () => {
    const wrapper = mountWithRenderer(NaiveFormRenderer)
    expect(wrapper.find('form').exists()).toBe(true)
    expect(wrapper.find('input[name="name"]').exists()).toBe(true)
  })
})
