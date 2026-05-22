import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, nextTick } from 'vue'
import { useMultiStepForm } from '../core/useMultiStepForm'
import type { UseFormConfig } from '../core/types'

const step1Config: Omit<UseFormConfig, 'onSubmit'> = {
  schema: [{ type: 'text', name: 'firstName', required: true }],
}

const step2Config: Omit<UseFormConfig, 'onSubmit'> = {
  schema: [{ type: 'email', name: 'email', required: true }],
}

const step3Config: Omit<UseFormConfig, 'onSubmit'> = {
  schema: [{ type: 'text', name: 'city' }],
}

function mountWizard(onSubmit?: (v: Record<string, unknown>) => void) {
  return mount(
    defineComponent({
      setup() {
        return useMultiStepForm([step1Config, step2Config, step3Config], onSubmit)
      },
      template: '<div></div>',
    }),
  )
}

describe('useMultiStepForm — initial state', () => {
  it('starts at step 0', () => {
    const w = mountWizard()
    expect(w.vm.currentStep).toBe(0)
    expect(w.vm.totalSteps).toBe(3)
    expect(w.vm.isFirstStep).toBe(true)
    expect(w.vm.isLastStep).toBe(false)
  })

  it('form returns the active step form', () => {
    const w = mountWizard()
    expect(w.vm.form).toBe(w.vm.steps[0])
  })
})

describe('useMultiStepForm — navigation', () => {
  it('back() does nothing on first step', () => {
    const w = mountWizard()
    w.vm.back()
    expect(w.vm.currentStep).toBe(0)
  })

  it('goTo() jumps to a step', () => {
    const w = mountWizard()
    w.vm.goTo(2)
    expect(w.vm.currentStep).toBe(2)
    expect(w.vm.isLastStep).toBe(true)
  })

  it('goTo() ignores out-of-range', () => {
    const w = mountWizard()
    w.vm.goTo(10)
    expect(w.vm.currentStep).toBe(0)
    w.vm.goTo(-1)
    expect(w.vm.currentStep).toBe(0)
  })

  it('back() returns to previous step', async () => {
    const w = mountWizard()
    w.vm.goTo(1)
    w.vm.back()
    await nextTick()
    expect(w.vm.currentStep).toBe(0)
  })
})

describe('useMultiStepForm — next() validation', () => {
  it('next() stays on step if validation fails', async () => {
    const w = mountWizard()
    const ok = await w.vm.next()
    expect(ok).toBe(false)
    expect(w.vm.currentStep).toBe(0)
    expect(Object.keys(w.vm.steps[0].errors.value).length).toBeGreaterThan(0)
  })

  it('next() advances when valid', async () => {
    const w = mountWizard()
    w.vm.steps[0].setField('firstName', 'Alice')
    await nextTick()
    const ok = await w.vm.next()
    expect(ok).toBe(true)
    expect(w.vm.currentStep).toBe(1)
  })
})

describe('useMultiStepForm — values & submit', () => {
  it('values merges all step values', async () => {
    const w = mountWizard()
    w.vm.steps[0].setField('firstName', 'Alice')
    w.vm.steps[1].setField('email', 'alice@test.com')
    w.vm.steps[2].setField('city', 'Berlin')
    await nextTick()
    expect(w.vm.values).toMatchObject({
      firstName: 'Alice',
      email: 'alice@test.com',
      city: 'Berlin',
    })
  })

  it('submit() calls onSubmit with merged values when all steps valid', async () => {
    const onSubmit = vi.fn()
    const w = mountWizard(onSubmit)
    w.vm.steps[0].setField('firstName', 'Alice')
    w.vm.steps[1].setField('email', 'alice@test.com')
    await nextTick()
    await w.vm.submit()
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      firstName: 'Alice',
      email: 'alice@test.com',
    }))
  })

  it('submit() does not call onSubmit when a step is invalid', async () => {
    const onSubmit = vi.fn()
    const w = mountWizard(onSubmit)
    // step1 requires firstName — leave it empty
    await w.vm.submit()
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
