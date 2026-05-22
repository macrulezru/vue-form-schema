import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, nextTick } from 'vue'
import { useForm } from '../core/useForm'
import { useFormDebug } from '../core/useFormDebug'
import { parseValibot } from '../parsers/valibot'
import type { FieldDefinition, FieldOption } from '../core/types'

// ─── #9 Valibot parser ────────────────────────────────────────────────────────

describe('parseValibot', () => {
  it('parses a v.object schema', async () => {
    const v = await import('valibot')
    const schema = v.object({
      name: v.string(),
      age: v.number(),
      agreed: v.boolean(),
    })
    const fields = parseValibot(schema)
    expect(fields.find((f) => f.name === 'name')?.type).toBe('text')
    expect(fields.find((f) => f.name === 'age')?.type).toBe('number')
    expect(fields.find((f) => f.name === 'agreed')?.type).toBe('checkbox')
  })

  it('maps picklist to select with options', async () => {
    const v = await import('valibot')
    const schema = v.object({ role: v.picklist(['admin', 'user']) })
    const fields = parseValibot(schema)
    const role = fields.find((f) => f.name === 'role')
    expect(role?.type).toBe('select')
    expect((role?.options as FieldOption[]).map((o) => o.value)).toEqual(['admin', 'user'])
  })

  it('detects email from v.pipe', async () => {
    const v = await import('valibot')
    const schema = v.object({ email: v.pipe(v.string(), v.email()) })
    const fields = parseValibot(schema)
    expect(fields[0].type).toBe('email')
  })

  it('marks optional fields as not required', async () => {
    const v = await import('valibot')
    const schema = v.object({
      required: v.string(),
      optional: v.optional(v.string()),
    })
    const fields = parseValibot(schema)
    expect(fields.find((f) => f.name === 'required')?.required).toBe(true)
    expect(fields.find((f) => f.name === 'optional')?.required).toBe(false)
  })

  it('maps nested object to group', async () => {
    const v = await import('valibot')
    const schema = v.object({
      address: v.object({ city: v.string() }),
    })
    const fields = parseValibot(schema)
    const addr = fields.find((f) => f.name === 'address')
    expect(addr?.type).toBe('group')
    expect(addr?.fields?.[0].name).toBe('city')
  })

  it('throws on non-object schema', async () => {
    const v = await import('valibot')
    expect(() => parseValibot(v.string())).toThrow()
  })
})

// ─── #10 Persist ──────────────────────────────────────────────────────────────

function makeStorage() {
  let store: Record<string, string> = {}
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v },
    removeItem: (k: string) => { delete store[k] },
    clear: () => { store = {} },
  }
}

describe('persist option', () => {
  const schema: FieldDefinition[] = [{ type: 'text', name: 'name', defaultValue: '' }]
  const localMock = makeStorage()
  const sessionMock = makeStorage()

  beforeAll(() => {
    vi.stubGlobal('localStorage', localMock)
    vi.stubGlobal('sessionStorage', sessionMock)
  })

  beforeEach(() => {
    localMock.clear()
    sessionMock.clear()
  })

  it('restores values from localStorage on mount', async () => {
    localStorage.setItem('vfs:name', JSON.stringify({ name: 'Alice' }))
    const w = mount(defineComponent({
      setup() { return useForm({ schema, persist: 'local', persistKey: 'vfs:name' }) },
      template: '<div/>',
    }))
    await nextTick()
    expect(w.vm.values.name).toBe('Alice')
  })

  it('saves to sessionStorage on value change', async () => {
    const w = mount(defineComponent({
      setup() { return useForm({ schema, persist: 'session', persistKey: 'test-key' }) },
      template: '<div/>',
    }))
    w.vm.setField('name', 'Bob')
    await nextTick()
    const stored = JSON.parse(sessionStorage.getItem('test-key') ?? '{}')
    expect(stored.name).toBe('Bob')
  })

  it('clears storage on reset()', async () => {
    const w = mount(defineComponent({
      setup() { return useForm({ schema, persist: 'local', persistKey: 'reset-key' }) },
      template: '<div/>',
    }))
    w.vm.setField('name', 'Eve')
    await nextTick()
    w.vm.reset()
    await nextTick()
    expect(localStorage.getItem('reset-key')).toBeNull()
  })
})

// ─── #16 Async options ────────────────────────────────────────────────────────

describe('async options', () => {
  it('resolves async options on mount', async () => {
    const asyncOpts = async (): Promise<FieldOption[]> => [
      { label: 'A', value: 'a' },
      { label: 'B', value: 'b' },
    ]
    const schema: FieldDefinition[] = [{ type: 'select', name: 'choice', options: asyncOpts }]
    const w = mount(defineComponent({
      setup() { return useForm({ schema }) },
      template: '<div/>',
    }))
    // Wait for onMounted + async resolution
    await nextTick()
    await nextTick()
    const choice = w.vm.fields.find((f: FieldDefinition) => f.name === 'choice')
    expect(Array.isArray(choice?.options)).toBe(true)
    expect((choice?.options as FieldOption[])[0].value).toBe('a')
  })

  it('shows optionsLoading=true while fetching', async () => {
    let resolve: (v: FieldOption[]) => void = () => {}
    const asyncOpts = () => new Promise<FieldOption[]>((r) => { resolve = r })
    const schema: FieldDefinition[] = [{ type: 'select', name: 'city', options: asyncOpts }]
    const w = mount(defineComponent({
      setup() { return useForm({ schema }) },
      template: '<div/>',
    }))
    await nextTick()
    // While promise is pending, optionsLoading should be true
    expect(w.vm.optionsLoading['city']).toBe(true)
    resolve([{ label: 'Berlin', value: 'berlin' }])
    await nextTick()
    await nextTick()
    expect(w.vm.optionsLoading['city']).toBe(false)
  })

  it('re-fetches options when optionsDeps field changes', async () => {
    let fetchCount = 0
    const asyncOpts = async (): Promise<FieldOption[]> => {
      fetchCount++
      return [{ label: 'X', value: 'x' }]
    }
    const schema: FieldDefinition[] = [
      { type: 'text', name: 'country' },
      { type: 'select', name: 'city', options: asyncOpts, optionsDeps: ['country'] },
    ]
    const w = mount(defineComponent({
      setup() { return useForm({ schema }) },
      template: '<div/>',
    }))
    await nextTick()
    await nextTick()
    const before = fetchCount
    w.vm.setField('country', 'DE')
    await nextTick()
    await nextTick()
    expect(fetchCount).toBeGreaterThan(before)
  })
})

// ─── #19 Debug mode ───────────────────────────────────────────────────────────

describe('debug mode', () => {
  it('useFormDebug returns a reactive snapshot', async () => {
    const w = mount(defineComponent({
      setup() {
        const form = useForm({
          schema: [{ type: 'text', name: 'email', required: true }],
        })
        const { snapshot } = useFormDebug(form)
        return { form, snapshot }
      },
      template: '<div/>',
    }))
    expect(w.vm.snapshot.isDirty).toBe(false)
    w.vm.form.setField('email', 'test@test.com')
    await nextTick()
    expect(w.vm.snapshot.isDirty).toBe(true)
    expect(w.vm.snapshot.values.email).toBe('test@test.com')
  })

  it('debug:true logs to console.group on value change', async () => {
    const spy = vi.spyOn(console, 'group').mockImplementation(() => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'groupEnd').mockImplementation(() => {})
    const w = mount(defineComponent({
      setup() { return useForm({ schema: [{ type: 'text', name: 'x' }], debug: true }) },
      template: '<div/>',
    }))
    w.vm.setField('x', 'hello')
    await nextTick()
    expect(spy).toHaveBeenCalledWith('[vue-form-schema] values changed')
    spy.mockRestore()
  })
})
