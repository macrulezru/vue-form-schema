import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import type { FieldDefinition, UseFormReturn } from './types'

export interface FieldArrayRow {
  /** Stable key for v-for */
  key: string
  index: number
  /** Sub-field definitions with row-namespaced names: `arrayName.rowIndex.subField` */
  fields: FieldDefinition[]
}

export interface UseFieldArrayReturn {
  rows: ComputedRef<FieldArrayRow[]>
  count: ComputedRef<number>
  append(value?: Record<string, unknown>): void
  prepend(value?: Record<string, unknown>): void
  remove(index: number): void
  move(from: number, to: number): void
  swap(a: number, b: number): void
  replace(index: number, value: Record<string, unknown>): void
}

export function useFieldArray(form: UseFormReturn, fieldName: string): UseFieldArrayReturn {
  const arrayField = computed(() => findField(form.fields.value, fieldName))

  const rows = computed((): FieldArrayRow[] => {
    const arr = (form.getField(fieldName) as unknown[]) ?? []
    return arr.map((_, index) => ({
      key: `${fieldName}__${index}`,
      index,
      fields: prefixFields(arrayField.value?.fields ?? [], fieldName, index),
    }))
  })

  const count = computed(() => rows.value.length)

  function getArray(): unknown[] {
    return [...((form.getField(fieldName) as unknown[]) ?? [])]
  }

  function append(value: Record<string, unknown> = {}) {
    const arr = getArray()
    arr.push(value)
    form.setField(fieldName, arr)
  }

  function prepend(value: Record<string, unknown> = {}) {
    const arr = getArray()
    arr.unshift(value)
    form.setField(fieldName, arr)
  }

  function remove(index: number) {
    const arr = getArray()
    arr.splice(index, 1)
    form.setField(fieldName, arr)
  }

  function move(from: number, to: number) {
    const arr = getArray()
    const [item] = arr.splice(from, 1)
    arr.splice(to, 0, item)
    form.setField(fieldName, arr)
  }

  function swap(a: number, b: number) {
    const arr = getArray()
    ;[arr[a], arr[b]] = [arr[b], arr[a]]
    form.setField(fieldName, arr)
  }

  function replace(index: number, value: Record<string, unknown>) {
    const arr = getArray()
    arr[index] = value
    form.setField(fieldName, arr)
  }

  return { rows, count, append, prepend, remove, move, swap, replace }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function prefixFields(
  fields: FieldDefinition[],
  arrayName: string,
  index: number,
): FieldDefinition[] {
  return fields.map((f) => ({
    ...f,
    name: `${arrayName}.${index}.${f.name}`,
    fields: f.fields ? prefixFields(f.fields, arrayName, index) : undefined,
  }))
}

function findField(fields: FieldDefinition[], name: string): FieldDefinition | undefined {
  for (const f of fields) {
    if (f.name === name) return f
    if (f.fields) {
      const found = findField(f.fields, name)
      if (found) return found
    }
  }
  return undefined
}
