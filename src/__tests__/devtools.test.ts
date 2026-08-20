import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { App } from 'vue'
import { installFormDevtools } from '../devtools/index'
import {
  registerForm,
  unregisterForm,
  emitFormEvent,
  getRegisteredForms,
} from '../core/formRegistry'
import type { UseFormReturn } from '../core/types'

// Fakes the pieces of the @vue/devtools-api surface installFormDevtools
// actually calls, captures the setup callback that setupDevtoolsPlugin
// would normally invoke with a real `api`, and drives it directly — the
// real devtools browser extension isn't available in a test environment.
const setupDevtoolsPlugin = vi.fn()
vi.mock('@vue/devtools-api', () => ({
  setupDevtoolsPlugin: (...args: unknown[]) => setupDevtoolsPlugin(...args),
}))

function makeFakeApi() {
  const handlers: Record<string, (payload: unknown) => void> = {}
  return {
    addInspector: vi.fn(),
    addTimelineLayer: vi.fn(),
    addTimelineEvent: vi.fn(),
    sendInspectorTree: vi.fn(),
    sendInspectorState: vi.fn(),
    on: {
      getInspectorTree: (fn: (payload: unknown) => void) => {
        handlers.getInspectorTree = fn
      },
      getInspectorState: (fn: (payload: unknown) => void) => {
        handlers.getInspectorState = fn
      },
    },
    _handlers: handlers,
  }
}

function fakeForm(overrides: Partial<UseFormReturn> = {}): UseFormReturn {
  return {
    values: { value: { name: 'Alice' } },
    errors: { value: {} },
    touched: { value: {} },
    optionsLoading: { value: {} },
    isDirty: { value: false },
    isValid: { value: true },
    isSubmitting: { value: false },
    fields: { value: [] },
    submit: vi.fn(),
    reset: vi.fn(),
    setField: vi.fn(),
    getField: vi.fn(),
    ...overrides,
  } as unknown as UseFormReturn
}

describe('installFormDevtools', () => {
  beforeEach(() => {
    setupDevtoolsPlugin.mockClear()
    for (const f of getRegisteredForms()) unregisterForm(f.id)
  })

  it('registers the plugin with setupDevtoolsPlugin', () => {
    installFormDevtools({} as App)
    expect(setupDevtoolsPlugin).toHaveBeenCalledTimes(1)
    const [descriptor] = setupDevtoolsPlugin.mock.calls[0]
    expect(descriptor).toMatchObject({ id: 'vue-form-schema', label: 'vue-form-schema' })
  })

  it('adds an inspector and a timeline layer', () => {
    const api = makeFakeApi()
    installFormDevtools({} as App)
    const setupFn = setupDevtoolsPlugin.mock.calls[0][1] as (api: unknown) => void
    setupFn(api)
    expect(api.addInspector).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'vue-form-schema-inspector' }),
    )
    expect(api.addTimelineLayer).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'vue-form-schema-timeline' }),
    )
  })

  it('getInspectorTree lists registered forms as nodes', () => {
    const id = registerForm(fakeForm(), 'CheckoutForm')
    const api = makeFakeApi()
    installFormDevtools({} as App)
    const setupFn = setupDevtoolsPlugin.mock.calls[0][1] as (api: unknown) => void
    setupFn(api)

    const payload = { inspectorId: 'vue-form-schema-inspector', rootNodes: [] as unknown[] }
    api._handlers.getInspectorTree(payload)
    expect(payload.rootNodes).toEqual([
      expect.objectContaining({ id: String(id), label: `CheckoutForm #${id}` }),
    ])
    unregisterForm(id)
  })

  it('getInspectorTree ignores payloads for a different inspector', () => {
    registerForm(fakeForm(), 'X')
    const api = makeFakeApi()
    installFormDevtools({} as App)
    const setupFn = setupDevtoolsPlugin.mock.calls[0][1] as (api: unknown) => void
    setupFn(api)

    const payload = { inspectorId: 'someone-elses-inspector', rootNodes: [] as unknown[] }
    api._handlers.getInspectorTree(payload)
    expect(payload.rootNodes).toEqual([])
  })

  it('tags a form with validation errors as invalid', () => {
    const id = registerForm(fakeForm({ errors: { value: { name: ['Required'] } } } as never), 'Bad')
    const api = makeFakeApi()
    installFormDevtools({} as App)
    const setupFn = setupDevtoolsPlugin.mock.calls[0][1] as (api: unknown) => void
    setupFn(api)

    const payload = { inspectorId: 'vue-form-schema-inspector', rootNodes: [] as never[] }
    api._handlers.getInspectorTree(payload)
    expect((payload.rootNodes[0] as { tags: { label: string }[] }).tags[0].label).toBe('invalid')
    unregisterForm(id)
  })

  it('getInspectorState returns values/errors/touched grouped by section', () => {
    const id = registerForm(
      fakeForm({
        values: { value: { name: 'Alice', email: '' } },
        errors: { value: { email: ['Required'] } },
        touched: { value: { email: true } },
      } as never),
      'F',
    )
    const api = makeFakeApi()
    installFormDevtools({} as App)
    const setupFn = setupDevtoolsPlugin.mock.calls[0][1] as (api: unknown) => void
    setupFn(api)

    const payload = {
      inspectorId: 'vue-form-schema-inspector',
      nodeId: String(id),
      state: undefined as unknown,
    }
    api._handlers.getInspectorState(payload)
    const state = payload.state as {
      values: { key: string; value: unknown }[]
      errors: { key: string; value: unknown }[]
      touched: { key: string; value: unknown }[]
    }
    expect(state.values).toContainEqual({ key: 'name', value: 'Alice' })
    expect(state.errors).toContainEqual({ key: 'email', value: ['Required'] })
    expect(state.touched).toContainEqual({ key: 'email', value: true })
    unregisterForm(id)
  })

  it('forwards form events to addTimelineEvent and refreshes the inspector', () => {
    const id = registerForm(fakeForm(), 'F')
    const api = makeFakeApi()
    installFormDevtools({} as App)
    const setupFn = setupDevtoolsPlugin.mock.calls[0][1] as (api: unknown) => void
    setupFn(api)

    emitFormEvent(id, 'setField', { path: 'name', value: 'Bob' })

    expect(api.addTimelineEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        layerId: 'vue-form-schema-timeline',
        event: expect.objectContaining({ title: 'setField', data: { path: 'name', value: 'Bob' } }),
      }),
    )
    expect(api.sendInspectorTree).toHaveBeenCalledWith('vue-form-schema-inspector')
    expect(api.sendInspectorState).toHaveBeenCalledWith('vue-form-schema-inspector')
    unregisterForm(id)
  })

  it('marks submitError events with logType "error"', () => {
    const id = registerForm(fakeForm(), 'F')
    const api = makeFakeApi()
    installFormDevtools({} as App)
    const setupFn = setupDevtoolsPlugin.mock.calls[0][1] as (api: unknown) => void
    setupFn(api)

    emitFormEvent(id, 'submitError', { reason: 'exception', error: 'boom' })

    expect(api.addTimelineEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event: expect.objectContaining({ logType: 'error' }) }),
    )
    unregisterForm(id)
  })

  it('is a no-op outside a browser environment (SSR)', () => {
    vi.stubGlobal('window', undefined)
    installFormDevtools({} as App)
    expect(setupDevtoolsPlugin).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })
})
