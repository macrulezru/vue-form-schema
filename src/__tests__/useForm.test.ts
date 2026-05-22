import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, nextTick } from 'vue'
import { useForm } from '../core/useForm'
import type { FieldDefinition } from '../core/types'

// Helper: mount a component that uses useForm
function mountForm(config: Parameters<typeof useForm>[0]) {
  return mount(
    defineComponent({
      setup() {
        return useForm(config)
      },
      template: '<div></div>',
    }),
  )
}

const basicFields: FieldDefinition[] = [
  { type: 'text', name: 'name', required: true },
  { type: 'email', name: 'email', validators: [(v) => (/\S+@\S+/.test(String(v)) ? null : 'Bad email')] },
]

describe('useForm — initial state', () => {
  it('initialises values from schema defaults', () => {
    const wrapper = mountForm({ schema: [{ type: 'text', name: 'name', defaultValue: 'John' }] })
    expect(wrapper.vm.values.name).toBe('John')
  })

  it('merges initialValues over defaults', () => {
    const wrapper = mountForm({
      schema: [{ type: 'text', name: 'name', defaultValue: 'John' }],
      initialValues: { name: 'Jane' },
    })
    expect(wrapper.vm.values.name).toBe('Jane')
  })

  it('isDirty is false initially', () => {
    const wrapper = mountForm({ schema: basicFields })
    expect(wrapper.vm.isDirty).toBe(false)
  })

  it('errors is empty initially', () => {
    const wrapper = mountForm({ schema: basicFields })
    expect(wrapper.vm.errors).toEqual({})
  })

  it('isSubmitting is false initially', () => {
    const wrapper = mountForm({ schema: basicFields })
    expect(wrapper.vm.isSubmitting).toBe(false)
  })
})

describe('useForm — setField / getField', () => {
  it('setField updates value', async () => {
    const wrapper = mountForm({ schema: basicFields })
    wrapper.vm.setField('name', 'Alice')
    await nextTick()
    expect(wrapper.vm.values.name).toBe('Alice')
  })

  it('getField returns current value', () => {
    const wrapper = mountForm({ schema: basicFields, initialValues: { name: 'Bob' } as never })
    expect(wrapper.vm.getField('name')).toBe('Bob')
  })

  it('setField on nested path', async () => {
    const fields: FieldDefinition[] = [{
      type: 'group', name: 'addr',
      fields: [{ type: 'text', name: 'addr.city' }],
    }]
    const wrapper = mountForm({ schema: fields })
    wrapper.vm.setField('addr.city', 'Moscow')
    await nextTick()
    expect(wrapper.vm.getField('addr.city')).toBe('Moscow')
  })
})

describe('useForm — isDirty', () => {
  it('becomes true after setField', async () => {
    const wrapper = mountForm({ schema: basicFields })
    wrapper.vm.setField('name', 'Changed')
    await nextTick()
    expect(wrapper.vm.isDirty).toBe(true)
  })
})

describe('useForm — validation on submit', () => {
  it('prevents submit when invalid', async () => {
    const onSubmit = vi.fn()
    const wrapper = mountForm({ schema: basicFields, onSubmit })
    await wrapper.vm.submit()
    expect(onSubmit).not.toHaveBeenCalled()
    expect(Object.keys(wrapper.vm.errors).length).toBeGreaterThan(0)
  })

  it('calls onSubmit when valid', async () => {
    const onSubmit = vi.fn()
    const wrapper = mountForm({
      schema: basicFields,
      initialValues: { name: 'Alice', email: 'alice@test.com' } as never,
      onSubmit,
    })
    await wrapper.vm.submit()
    expect(onSubmit).toHaveBeenCalledWith({ name: 'Alice', email: 'alice@test.com' })
  })
})

describe('useForm — validateOn=input', () => {
  it('validates on setField when validateOn=input', async () => {
    const wrapper = mountForm({ schema: basicFields, validateOn: 'input' })
    wrapper.vm.setField('email', 'bad')
    await nextTick()
    expect(wrapper.vm.errors['email']).toBeTruthy()
  })
})

describe('useForm — reset', () => {
  it('resets to initial values', async () => {
    const wrapper = mountForm({
      schema: basicFields,
      initialValues: { name: 'Alice' } as never,
    })
    wrapper.vm.setField('name', 'Changed')
    wrapper.vm.reset()
    await nextTick()
    expect(wrapper.vm.values.name).toBe('Alice')
    expect(wrapper.vm.isDirty).toBe(false)
  })

  it('resets to provided values', async () => {
    const wrapper = mountForm({ schema: basicFields })
    wrapper.vm.reset({ name: 'New' } as never)
    await nextTick()
    expect(wrapper.vm.values.name).toBe('New')
  })
})

describe('useForm — fields (condition evaluator integration)', () => {
  it('hides field when visible=false', async () => {
    const fields: FieldDefinition[] = [
      { type: 'text', name: 'name' },
      { type: 'text', name: 'extra', visible: (values) => values['name'] === 'show' },
    ]
    const wrapper = mountForm({ schema: fields })
    await nextTick()
    const visible = wrapper.vm.fields.filter((f: FieldDefinition) => f.visible !== false)
    expect(visible.some((f: FieldDefinition) => f.name === 'extra')).toBe(false)
  })

  it('shows field when condition is met', async () => {
    const fields: FieldDefinition[] = [
      { type: 'text', name: 'name' },
      { type: 'text', name: 'extra', visible: (values) => values['name'] === 'show' },
    ]
    const wrapper = mountForm({ schema: fields })
    wrapper.vm.setField('name', 'show')
    await nextTick()
    const extra = wrapper.vm.fields.find((f: FieldDefinition) => f.name === 'extra')
    expect(extra?.visible).toBe(true)
  })
})

describe('useForm — isValid', () => {
  it('is false when there are required fields missing', async () => {
    const wrapper = mountForm({ schema: basicFields })
    expect(wrapper.vm.isValid).toBe(false)
  })

  it('is true when all required fields satisfied', async () => {
    const wrapper = mountForm({
      schema: basicFields,
      initialValues: { name: 'Alice', email: 'a@b.com' } as never,
    })
    expect(wrapper.vm.isValid).toBe(true)
  })
})
