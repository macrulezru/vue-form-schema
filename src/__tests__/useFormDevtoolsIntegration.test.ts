import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, nextTick } from 'vue'
import { useForm } from '../core/useForm'
import { getRegisteredForms, onFormEvent, type FormEvent } from '../core/formRegistry'
import type { FieldDefinition } from '../core/types'

// Verifies useForm's wiring into the internal form registry/event bus that
// the optional DevTools plugin (vue-form-schema/devtools) reads from. This
// wiring lives in useForm.ts itself (registerForm/emitFormEvent calls), so
// it's tested here rather than in formRegistry.test.ts (which only tests
// the registry in isolation) or devtools.test.ts (which tests the plugin
// against a fake registry, not real useForm instances).

const schema: FieldDefinition[] = [
  { type: 'text', name: 'name', required: true },
  { type: 'email', name: 'email' },
]

function NamedForm(config: Parameters<typeof useForm>[0]) {
  return defineComponent({
    __name: 'NamedForm',
    setup() {
      const form = useForm(config)
      return { form }
    },
    template: '<div></div>',
  })
}

describe('useForm — registry integration', () => {
  it('registers itself on mount and unregisters on unmount', () => {
    const before = getRegisteredForms().length
    const wrapper = mount(NamedForm({ schema }))
    expect(getRegisteredForms().length).toBe(before + 1)
    wrapper.unmount()
    expect(getRegisteredForms().length).toBe(before)
  })

  it('uses the enclosing component name as the registered label', () => {
    const wrapper = mount(NamedForm({ schema }))
    const entries = getRegisteredForms()
    expect(entries[entries.length - 1].label).toBe('NamedForm')
    wrapper.unmount()
  })
})

describe('useForm — event emission', () => {
  function capture() {
    const events: FormEvent[] = []
    const unsubscribe = onFormEvent((e) => events.push(e))
    return { events, unsubscribe }
  }

  it('emits setField on every setField call', () => {
    const { events, unsubscribe } = capture()
    const wrapper = mount(NamedForm({ schema }))
    wrapper.vm.form.setField('name', 'Alice')
    unsubscribe()
    wrapper.unmount()
    const setFieldEvents = events.filter((e) => e.type === 'setField')
    expect(setFieldEvents).toHaveLength(1)
    expect(setFieldEvents[0].payload).toEqual({ path: 'name', value: 'Alice' })
  })

  it('emits touch on touchField', () => {
    const { events, unsubscribe } = capture()
    const wrapper = mount(NamedForm({ schema }))
    ;(wrapper.vm.form as unknown as { touchField: (p: string) => void }).touchField('email')
    unsubscribe()
    wrapper.unmount()
    expect(events.some((e) => e.type === 'touch' && e.payload?.path === 'email')).toBe(true)
  })

  it('emits submit then submitError with reason "validation" when required fields are missing', async () => {
    const { events, unsubscribe } = capture()
    const wrapper = mount(NamedForm({ schema, onSubmit: vi.fn() }))
    await wrapper.vm.form.submit()
    unsubscribe()
    wrapper.unmount()
    expect(events.map((e) => e.type)).toEqual(expect.arrayContaining(['submit', 'submitError']))
    const submitError = events.find((e) => e.type === 'submitError')
    expect(submitError?.payload?.reason).toBe('validation')
  })

  it('emits submit then submitSuccess on a successful submission', async () => {
    const { events, unsubscribe } = capture()
    const wrapper = mount(
      NamedForm({
        schema,
        initialValues: { name: 'Alice' } as never,
        onSubmit: vi.fn(),
      }),
    )
    await wrapper.vm.form.submit()
    unsubscribe()
    wrapper.unmount()
    expect(events.map((e) => e.type)).toEqual(['submit', 'submitSuccess'])
  })

  it('emits submitError with reason "exception" when onSubmit throws, and still rejects', async () => {
    const { events, unsubscribe } = capture()
    const wrapper = mount(
      NamedForm({
        schema,
        initialValues: { name: 'Alice' } as never,
        onSubmit: () => {
          throw new Error('boom')
        },
      }),
    )
    await expect(wrapper.vm.form.submit()).rejects.toThrow('boom')
    unsubscribe()
    wrapper.unmount()
    const submitError = events.find((e) => e.type === 'submitError')
    expect(submitError?.payload).toEqual({ reason: 'exception', error: 'boom' })
  })

  it('emits reset on reset()', () => {
    const { events, unsubscribe } = capture()
    const wrapper = mount(NamedForm({ schema }))
    wrapper.vm.form.reset()
    unsubscribe()
    wrapper.unmount()
    expect(events.some((e) => e.type === 'reset')).toBe(true)
  })

  it('emits asyncValidate once a debounced async validator resolves', async () => {
    const asyncSchema: FieldDefinition[] = [
      {
        type: 'text',
        name: 'username',
        asyncValidators: [async (v) => (v === 'taken' ? 'Username taken' : null)],
      },
    ]
    const { events, unsubscribe } = capture()
    const wrapper = mount(NamedForm({ schema: asyncSchema, validateOn: 'input' }))
    wrapper.vm.form.setField('username', 'taken')
    await new Promise((r) => setTimeout(r, 350)) // past the 300ms debounce
    await nextTick()
    unsubscribe()
    wrapper.unmount()
    const asyncEvent = events.find((e) => e.type === 'asyncValidate')
    expect(asyncEvent?.payload).toEqual({ path: 'username', errors: ['Username taken'] })
  })
})
