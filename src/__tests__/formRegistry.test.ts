import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  registerForm,
  unregisterForm,
  getRegisteredForm,
  getRegisteredForms,
  emitFormEvent,
  onFormEvent,
} from '../core/formRegistry'
import type { UseFormReturn } from '../core/types'

function fakeForm(): UseFormReturn {
  return {} as UseFormReturn
}

describe('formRegistry — register/unregister', () => {
  it('registers a form and returns a unique id', () => {
    const id1 = registerForm(fakeForm(), 'A')
    const id2 = registerForm(fakeForm(), 'B')
    expect(id1).not.toBe(id2)
    unregisterForm(id1)
    unregisterForm(id2)
  })

  it('getRegisteredForm returns the registered entry', () => {
    const form = fakeForm()
    const id = registerForm(form, 'MyForm')
    const entry = getRegisteredForm(id)
    expect(entry?.label).toBe('MyForm')
    expect(entry?.form).toBe(form)
    unregisterForm(id)
  })

  it('getRegisteredForm returns undefined for an unknown id', () => {
    expect(getRegisteredForm(999999)).toBeUndefined()
  })

  it('unregisterForm removes the entry', () => {
    const id = registerForm(fakeForm(), 'X')
    expect(getRegisteredForm(id)).toBeDefined()
    unregisterForm(id)
    expect(getRegisteredForm(id)).toBeUndefined()
  })

  it('getRegisteredForms lists all currently registered forms', () => {
    const before = getRegisteredForms().length
    const id1 = registerForm(fakeForm(), 'A')
    const id2 = registerForm(fakeForm(), 'B')
    expect(getRegisteredForms().length).toBe(before + 2)
    unregisterForm(id1)
    unregisterForm(id2)
    expect(getRegisteredForms().length).toBe(before)
  })
})

describe('formRegistry — events', () => {
  it('onFormEvent receives events emitted after subscribing', () => {
    const listener = vi.fn()
    const unsubscribe = onFormEvent(listener)
    emitFormEvent(1, 'setField', { path: 'name', value: 'Alice' })
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        formId: 1,
        type: 'setField',
        payload: { path: 'name', value: 'Alice' },
      }),
    )
    unsubscribe()
  })

  it('unsubscribe stops further delivery', () => {
    const listener = vi.fn()
    const unsubscribe = onFormEvent(listener)
    unsubscribe()
    emitFormEvent(1, 'submit')
    expect(listener).not.toHaveBeenCalled()
  })

  it('supports multiple independent listeners', () => {
    const a = vi.fn()
    const b = vi.fn()
    const unsubA = onFormEvent(a)
    const unsubB = onFormEvent(b)
    emitFormEvent(1, 'reset')
    expect(a).toHaveBeenCalledTimes(1)
    expect(b).toHaveBeenCalledTimes(1)
    unsubA()
    unsubB()
  })

  it('emitFormEvent is a no-op (does not throw) with no listeners', () => {
    expect(() => emitFormEvent(1, 'touch', { path: 'x' })).not.toThrow()
  })

  it('stamps each event with a time', () => {
    const listener = vi.fn()
    const unsubscribe = onFormEvent(listener)
    const before = Date.now()
    emitFormEvent(1, 'submitSuccess')
    const event = listener.mock.calls[0][0]
    expect(event.time).toBeGreaterThanOrEqual(before)
    unsubscribe()
  })
})

describe('formRegistry — cleanup between tests', () => {
  beforeEach(() => {
    for (const f of getRegisteredForms()) unregisterForm(f.id)
  })

  it('starts each test with an empty registry', () => {
    expect(getRegisteredForms()).toEqual([])
  })
})
