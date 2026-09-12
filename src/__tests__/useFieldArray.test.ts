import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, nextTick } from 'vue'
import { useForm } from '../core/useForm'
import { useFieldArray } from '../core/useFieldArray'
import type { FieldDefinition } from '../core/types'

const schema: FieldDefinition[] = [
  {
    type: 'array',
    name: 'items',
    fields: [
      { type: 'text', name: 'title', required: true },
      { type: 'number', name: 'qty' },
    ],
  },
]

function mountArray() {
  return mount(
    defineComponent({
      setup() {
        const form = useForm({ schema, initialValues: { items: [] } })
        const arr = useFieldArray(form, 'items')
        return { form, arr }
      },
      template: '<div></div>',
    }),
  )
}

describe('useFieldArray — rows', () => {
  it('starts with zero rows', () => {
    const w = mountArray()
    expect(w.vm.arr.rows.value.length).toBe(0)
    expect(w.vm.arr.count.value).toBe(0)
  })

  it('row fields get prefixed names', async () => {
    const w = mountArray()
    w.vm.arr.append({ title: 'A', qty: 1 })
    await nextTick()
    const row = w.vm.arr.rows.value[0]
    expect(row.fields[0].name).toBe('items.0.title')
    expect(row.fields[1].name).toBe('items.0.qty')
  })
})

describe('useFieldArray — mutations', () => {
  it('append adds a row', async () => {
    const w = mountArray()
    w.vm.arr.append({ title: 'A', qty: 1 })
    await nextTick()
    expect(w.vm.arr.count.value).toBe(1)
    expect((w.vm.form.getField('items') as unknown[])[0]).toEqual({ title: 'A', qty: 1 })
  })

  it('prepend inserts at beginning', async () => {
    const w = mountArray()
    w.vm.arr.append({ title: 'B' })
    w.vm.arr.prepend({ title: 'A' })
    await nextTick()
    expect((w.vm.form.getField('items') as { title: string }[])[0].title).toBe('A')
    expect((w.vm.form.getField('items') as { title: string }[])[1].title).toBe('B')
  })

  it('remove deletes by index', async () => {
    const w = mountArray()
    w.vm.arr.append({ title: 'A' })
    w.vm.arr.append({ title: 'B' })
    w.vm.arr.remove(0)
    await nextTick()
    expect(w.vm.arr.count.value).toBe(1)
    expect((w.vm.form.getField('items') as { title: string }[])[0].title).toBe('B')
  })

  it('move reorders rows', async () => {
    const w = mountArray()
    w.vm.arr.append({ title: 'A' })
    w.vm.arr.append({ title: 'B' })
    w.vm.arr.append({ title: 'C' })
    w.vm.arr.move(0, 2)
    await nextTick()
    const items = w.vm.form.getField('items') as { title: string }[]
    expect(items[0].title).toBe('B')
    expect(items[2].title).toBe('A')
  })

  it('swap exchanges two rows', async () => {
    const w = mountArray()
    w.vm.arr.append({ title: 'A' })
    w.vm.arr.append({ title: 'B' })
    w.vm.arr.swap(0, 1)
    await nextTick()
    const items = w.vm.form.getField('items') as { title: string }[]
    expect(items[0].title).toBe('B')
    expect(items[1].title).toBe('A')
  })

  it('replace updates a row by index', async () => {
    const w = mountArray()
    w.vm.arr.append({ title: 'Old' })
    w.vm.arr.replace(0, { title: 'New', qty: 5 })
    await nextTick()
    expect((w.vm.form.getField('items') as { title: string; qty: number }[])[0]).toEqual({
      title: 'New',
      qty: 5,
    })
  })
})

describe('useFieldArray — errors/touched renumbering', () => {
  // Regression: remove/move/swap (and prepend) mutate the underlying array but
  // used to leave form.errors/form.touched keyed by the *old* row indices — so
  // after a reorder/removal, a row could inherit another row's stale
  // error/touched state purely because its index shifted, with no relation to
  // that row's own content.

  it('remove() shifts down errors/touched for every row after the removed one, and drops the removed row entirely', async () => {
    const w = mountArray()
    w.vm.arr.append({ title: 'A' })
    w.vm.arr.append({ title: 'B' })
    w.vm.arr.append({ title: 'C' })
    await nextTick()
    w.vm.form.errors.value = {
      'items.0.title': ['error on A'],
      'items.1.title': ['error on B'],
      'items.2.title': ['error on C'],
    }
    w.vm.form.touched.value = {
      'items.0.title': true,
      'items.1.title': true,
      'items.2.title': true,
    }

    w.vm.arr.remove(0) // removes A; B and C shift down to indices 0 and 1
    await nextTick()

    expect(w.vm.form.errors.value['items.0.title']).toEqual(['error on B'])
    expect(w.vm.form.errors.value['items.1.title']).toEqual(['error on C'])
    expect(w.vm.form.errors.value['items.2.title']).toBeUndefined()
    expect(w.vm.form.touched.value).toEqual({ 'items.0.title': true, 'items.1.title': true })
  })

  it('move() renumbers errors/touched to follow the moved and shifted rows', async () => {
    const w = mountArray()
    w.vm.arr.append({ title: 'A' })
    w.vm.arr.append({ title: 'B' })
    w.vm.arr.append({ title: 'C' })
    await nextTick()
    w.vm.form.errors.value = {
      'items.0.title': ['error on A'],
      'items.1.title': ['error on B'],
      'items.2.title': ['error on C'],
    }

    w.vm.arr.move(0, 2) // A -> index 2; B, C shift down to 0, 1
    await nextTick()

    expect(w.vm.form.errors.value['items.0.title']).toEqual(['error on B'])
    expect(w.vm.form.errors.value['items.1.title']).toEqual(['error on C'])
    expect(w.vm.form.errors.value['items.2.title']).toEqual(['error on A'])
  })

  it('swap() exchanges errors/touched between exactly the two swapped rows', async () => {
    const w = mountArray()
    w.vm.arr.append({ title: 'A' })
    w.vm.arr.append({ title: 'B' })
    await nextTick()
    w.vm.form.errors.value = {
      'items.0.title': ['error on A'],
      'items.1.title': ['error on B'],
    }
    w.vm.form.touched.value = { 'items.0.title': true }

    w.vm.arr.swap(0, 1)
    await nextTick()

    expect(w.vm.form.errors.value['items.0.title']).toEqual(['error on B'])
    expect(w.vm.form.errors.value['items.1.title']).toEqual(['error on A'])
    expect(w.vm.form.touched.value).toEqual({ 'items.1.title': true })
  })

  it("prepend() shifts every existing row's errors/touched up by one", async () => {
    const w = mountArray()
    w.vm.arr.append({ title: 'A' })
    w.vm.arr.append({ title: 'B' })
    await nextTick()
    w.vm.form.errors.value = {
      'items.0.title': ['error on A'],
      'items.1.title': ['error on B'],
    }

    w.vm.arr.prepend({ title: 'new-first' })
    await nextTick()

    expect(w.vm.form.errors.value['items.0.title']).toBeUndefined()
    expect(w.vm.form.errors.value['items.1.title']).toEqual(['error on A'])
    expect(w.vm.form.errors.value['items.2.title']).toEqual(['error on B'])
  })

  it('leaves errors/touched for unrelated fields (outside this array) untouched', async () => {
    const w = mountArray()
    w.vm.arr.append({ title: 'A' })
    w.vm.arr.append({ title: 'B' })
    await nextTick()
    w.vm.form.errors.value = {
      'items.0.title': ['error on A'],
      otherField: ['unrelated error'],
    }

    w.vm.arr.remove(0)
    await nextTick()

    expect(w.vm.form.errors.value['otherField']).toEqual(['unrelated error'])
  })
})

describe('useFieldArray — setField via prefixed path', () => {
  it('setField on prefixed path updates array item', async () => {
    const w = mountArray()
    w.vm.arr.append({ title: '', qty: 0 })
    await nextTick()
    w.vm.form.setField('items.0.title', 'Hello')
    await nextTick()
    expect(w.vm.form.getField('items.0.title')).toBe('Hello')
  })
})
