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

  it('maps nested object to group, prefixing sub-field names with the parent', async () => {
    // Regression: sub-field names used to come back bare ("city") instead of
    // prefixed ("address.city") — inconsistent with parseZod/parseYup and
    // broken for the rest of the library, since getByPath/setByPath,
    // buildInitialValues and FormRenderer's group rendering all require
    // group children to carry the full dotted path in their own name.
    const v = await import('valibot')
    const schema = v.object({
      address: v.object({ city: v.string() }),
    })
    const fields = parseValibot(schema)
    const addr = fields.find((f) => f.name === 'address')
    expect(addr?.type).toBe('group')
    expect(addr?.fields?.[0].name).toBe('address.city')
  })

  it('throws on non-object, non-variant schema', async () => {
    const v = await import('valibot')
    expect(() => parseValibot(v.string())).toThrow()
  })

  describe('v.variant() discriminated schemas', () => {
    it("produces a select discriminator plus every variant's fields", async () => {
      const v = await import('valibot')
      const schema = v.variant('method', [
        v.object({ method: v.literal('card'), cardNumber: v.string() }),
        v.object({ method: v.literal('paypal'), paypalEmail: v.pipe(v.string(), v.email()) }),
      ])
      const fields = parseValibot(schema)

      const discriminator = fields.find((f) => f.name === 'method')
      expect(discriminator?.type).toBe('select')
      expect((discriminator?.options as FieldOption[]).map((o) => o.value)).toEqual([
        'card',
        'paypal',
      ])

      const cardNumber = fields.find((f) => f.name === 'cardNumber')
      const paypalEmail = fields.find((f) => f.name === 'paypalEmail')
      expect(cardNumber?.type).toBe('text')
      expect(paypalEmail?.type).toBe('email')

      // each variant's fields are only "visible" while the discriminator matches
      const resolveCard = cardNumber?.visible as (v: Record<string, unknown>) => boolean
      expect(resolveCard({ method: 'card' })).toBe(true)
      expect(resolveCard({ method: 'paypal' })).toBe(false)
    })

    it('excludes the discriminator key itself from the variant field lists', async () => {
      const v = await import('valibot')
      const schema = v.variant('method', [
        v.object({ method: v.literal('card'), cardNumber: v.string() }),
      ])
      const fields = parseValibot(schema)
      // exactly one 'method' field (the discriminator) — not duplicated per variant
      expect(fields.filter((f) => f.name === 'method')).toHaveLength(1)
    })
  })
})

// ─── #10 Persist ──────────────────────────────────────────────────────────────

function makeStorage() {
  let store: Record<string, string> = {}
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => {
      store[k] = v
    },
    removeItem: (k: string) => {
      delete store[k]
    },
    clear: () => {
      store = {}
    },
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
    const w = mount(
      defineComponent({
        setup() {
          return useForm({ schema, persist: 'local', persistKey: 'vfs:name' })
        },
        template: '<div/>',
      }),
    )
    await nextTick()
    expect(w.vm.values.name).toBe('Alice')
  })

  it('saves to sessionStorage on value change', async () => {
    const w = mount(
      defineComponent({
        setup() {
          return useForm({ schema, persist: 'session', persistKey: 'test-key' })
        },
        template: '<div/>',
      }),
    )
    w.vm.setField('name', 'Bob')
    await nextTick()
    const stored = JSON.parse(sessionStorage.getItem('test-key') ?? '{}')
    expect(stored.name).toBe('Bob')
  })

  it('clears storage on reset()', async () => {
    const w = mount(
      defineComponent({
        setup() {
          return useForm({ schema, persist: 'local', persistKey: 'reset-key' })
        },
        template: '<div/>',
      }),
    )
    w.vm.setField('name', 'Eve')
    await nextTick()
    w.vm.reset()
    await nextTick()
    expect(localStorage.getItem('reset-key')).toBeNull()
  })

  it('warns when persist is enabled without an explicit persistKey', () => {
    // Regression: the default persistKey is just field names joined together —
    // no warning meant two unrelated forms sharing field names silently shared
    // storage with no indication anything was wrong.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mount(
      defineComponent({
        setup() {
          return useForm({ schema, persist: 'local' })
        },
        template: '<div/>',
      }),
    )
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('persistKey'))
    warn.mockRestore()
  })

  it('does not warn when an explicit persistKey is provided', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mount(
      defineComponent({
        setup() {
          return useForm({ schema, persist: 'local', persistKey: 'explicit-key' })
        },
        template: '<div/>',
      }),
    )
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('two unrelated forms with identical field names default to the same storage key', async () => {
    // Documents the actual collision the warning above is about — schemaA and
    // schemaB are unrelated but share a field name/order, so their default keys
    // collide and one form's persisted value silently leaks into the other.
    const schemaA: FieldDefinition[] = [{ type: 'text', name: 'name', defaultValue: '' }]
    const schemaB: FieldDefinition[] = [{ type: 'text', name: 'name', defaultValue: '' }]
    const wA = mount(
      defineComponent({
        setup() {
          return useForm({ schema: schemaA, persist: 'local' })
        },
        template: '<div/>',
      }),
    )
    wA.vm.setField('name', 'from-form-a')
    await nextTick()

    const wB = mount(
      defineComponent({
        setup() {
          return useForm({ schema: schemaB, persist: 'local' })
        },
        template: '<div/>',
      }),
    )
    await nextTick()

    expect(wB.vm.values.name).toBe('from-form-a')
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
    const w = mount(
      defineComponent({
        setup() {
          return useForm({ schema })
        },
        template: '<div/>',
      }),
    )
    // Wait for onMounted + async resolution
    await nextTick()
    await nextTick()
    const choice = w.vm.fields.find((f: FieldDefinition) => f.name === 'choice')
    expect(Array.isArray(choice?.options)).toBe(true)
    expect((choice?.options as FieldOption[])[0].value).toBe('a')
  })

  it('shows optionsLoading=true while fetching', async () => {
    let resolve: (v: FieldOption[]) => void = () => {}
    const asyncOpts = () =>
      new Promise<FieldOption[]>((r) => {
        resolve = r
      })
    const schema: FieldDefinition[] = [{ type: 'select', name: 'city', options: asyncOpts }]
    const w = mount(
      defineComponent({
        setup() {
          return useForm({ schema })
        },
        template: '<div/>',
      }),
    )
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
    const w = mount(
      defineComponent({
        setup() {
          return useForm({ schema })
        },
        template: '<div/>',
      }),
    )
    await nextTick()
    await nextTick()
    const before = fetchCount
    w.vm.setField('country', 'DE')
    await nextTick()
    await nextTick()
    expect(fetchCount).toBeGreaterThan(before)
  })

  it('does not re-invoke an async options function when an unrelated field changes', async () => {
    // Regression: the shared condition-evaluation watchEffect used to call every
    // function-valued options() on every value change in the whole form (to check
    // whether the result was a Promise), not just when that field's own
    // optionsDeps changed — so an async options() still fired (and its side
    // effects, e.g. a fetch, still started) on completely unrelated edits, even
    // though only the optionsDeps-triggered result was ever actually used.
    let fetchCount = 0
    const asyncOpts = async (): Promise<FieldOption[]> => {
      fetchCount++
      return [{ label: 'X', value: 'x' }]
    }
    const schema: FieldDefinition[] = [
      { type: 'text', name: 'unrelated' },
      { type: 'select', name: 'city', options: asyncOpts, optionsDeps: ['country'] },
    ]
    const w = mount(
      defineComponent({
        setup() {
          return useForm({ schema })
        },
        template: '<div/>',
      }),
    )
    await nextTick()
    await nextTick()
    const afterMount = fetchCount
    expect(afterMount).toBe(1) // the initial on-mount fetch

    w.vm.setField('unrelated', 'a')
    await nextTick()
    w.vm.setField('unrelated', 'b')
    await nextTick()
    w.vm.setField('unrelated', 'c')
    await nextTick()

    expect(fetchCount).toBe(afterMount)
  })

  it('still evaluates a synchronous values-dependent options function on every relevant change', async () => {
    // Sanity check that the fix above didn't also break the legitimate, fully
    // synchronous "options depend on current values" pattern (no optionsDeps
    // involved at all, since there's nothing async to defer).
    const schema: FieldDefinition[] = [
      { type: 'text', name: 'country' },
      {
        type: 'select',
        name: 'city',
        options: (values) =>
          values.country === 'DE'
            ? [{ label: 'Berlin', value: 'berlin' }]
            : [{ label: 'Paris', value: 'paris' }],
      },
    ]
    const w = mount(
      defineComponent({
        setup() {
          return useForm({ schema })
        },
        template: '<div/>',
      }),
    )
    await nextTick()
    let city = w.vm.fields.find((f: FieldDefinition) => f.name === 'city')
    expect((city?.options as FieldOption[])[0].value).toBe('paris')

    w.vm.setField('country', 'DE')
    await nextTick()
    city = w.vm.fields.find((f: FieldDefinition) => f.name === 'city')
    expect((city?.options as FieldOption[])[0].value).toBe('berlin')
  })
})

// ─── #19 Debug mode ───────────────────────────────────────────────────────────

describe('debug mode', () => {
  it('useFormDebug returns a reactive snapshot', async () => {
    const w = mount(
      defineComponent({
        setup() {
          const form = useForm({
            schema: [{ type: 'text', name: 'email', required: true }],
          })
          const { snapshot } = useFormDebug(form)
          return { form, snapshot }
        },
        template: '<div/>',
      }),
    )
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
    const w = mount(
      defineComponent({
        setup() {
          return useForm({ schema: [{ type: 'text', name: 'x' }], debug: true })
        },
        template: '<div/>',
      }),
    )
    w.vm.setField('x', 'hello')
    await nextTick()
    expect(spy).toHaveBeenCalledWith('[vue-form-schema] values changed')
    spy.mockRestore()
  })
})
