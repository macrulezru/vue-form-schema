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

  // errors/touched are keyed by row-namespaced dot-path (`fieldName.rowIndex.subField`),
  // same as the fields these rows produce (see prefixFields below) — a row
  // reorder/removal/insert-before-existing-rows has to renumber those keys too,
  // or a later row inherits an earlier row's stale error/touched state (or vice
  // versa) purely because its index shifted.
  function renumberAfterMutation(mapIndex: (oldIndex: number) => number | null) {
    form.errors.value = remapRowKeys(form.errors.value, fieldName, mapIndex)
    form.touched.value = remapRowKeys(form.touched.value, fieldName, mapIndex)
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
    renumberAfterMutation((oldIndex) => oldIndex + 1)
  }

  function remove(index: number) {
    const arr = getArray()
    arr.splice(index, 1)
    form.setField(fieldName, arr)
    renumberAfterMutation((oldIndex) => {
      if (oldIndex === index) return null
      return oldIndex > index ? oldIndex - 1 : oldIndex
    })
  }

  function move(from: number, to: number) {
    const arr = getArray()
    const [item] = arr.splice(from, 1)
    arr.splice(to, 0, item)
    form.setField(fieldName, arr)
    renumberAfterMutation((oldIndex) => {
      if (oldIndex === from) return to
      if (from < to && oldIndex > from && oldIndex <= to) return oldIndex - 1
      if (from > to && oldIndex >= to && oldIndex < from) return oldIndex + 1
      return oldIndex
    })
  }

  function swap(a: number, b: number) {
    const arr = getArray()
    ;[arr[a], arr[b]] = [arr[b], arr[a]]
    form.setField(fieldName, arr)
    renumberAfterMutation((oldIndex) => {
      if (oldIndex === a) return b
      if (oldIndex === b) return a
      return oldIndex
    })
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

/**
 * Rewrites keys of the shape `fieldName.oldIndex` or `fieldName.oldIndex.rest`
 * to use `mapIndex(oldIndex)` instead — dropping the key entirely when
 * `mapIndex` returns null (the row was removed). Keys outside `fieldName`'s
 * namespace, or malformed (non-numeric index segment), pass through unchanged.
 */
function remapRowKeys<T>(
  record: Record<string, T>,
  fieldName: string,
  mapIndex: (oldIndex: number) => number | null,
): Record<string, T> {
  const prefix = `${fieldName}.`
  const result: Record<string, T> = {}
  for (const [key, value] of Object.entries(record)) {
    if (key.startsWith(prefix)) {
      const rest = key.slice(prefix.length)
      const dotIndex = rest.indexOf('.')
      const indexSegment = dotIndex === -1 ? rest : rest.slice(0, dotIndex)
      if (/^\d+$/.test(indexSegment)) {
        const oldIndex = Number(indexSegment)
        const newIndex = mapIndex(oldIndex)
        if (newIndex === null) continue
        const suffix = dotIndex === -1 ? '' : rest.slice(dotIndex)
        result[`${fieldName}.${newIndex}${suffix}`] = value
        continue
      }
    }
    result[key] = value
  }
  return result
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
