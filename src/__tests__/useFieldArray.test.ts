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
