import type { UseFormReturn } from './types'

/**
 * Result of normalising a server error response: errors attributable to a
 * specific field (keyed the same way as `form.errors`, i.e. by
 * `FieldDefinition.name` / dot-path) and errors that aren't tied to any
 * single field (e.g. Laravel's top-level `message`, DRF's
 * `non_field_errors` / `detail`) — the caller decides where to show those
 * (a toast, a banner above the form, ...), since there's no single input to
 * attach them to.
 */
export interface NormalizedServerErrors {
  fieldErrors: Record<string, string[]>
  formErrors: string[]
}

export type ServerErrorFormat = 'laravel' | 'drf' | 'flat'

export type ServerErrorMapper = (raw: unknown) => NormalizedServerErrors

export interface ApplyServerErrorsOptions {
  /**
   * Built-in format name, or a custom mapper for anything else.
   * @default 'flat'
   */
  format?: ServerErrorFormat | ServerErrorMapper
  /**
   * Mark every field that receives a server error as touched, so it's
   * visible immediately instead of waiting for the user to blur it.
   * @default true
   */
  touch?: boolean
  /**
   * Merge into the form's current `errors` rather than replacing it
   * wholesale — keeps any client-side errors on fields the server response
   * didn't mention.
   * @default true
   */
  merge?: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string')
  if (typeof value === 'string') return [value]
  return []
}

// ─── Built-in formats ─────────────────────────────────────────────────────────

/**
 * Laravel's default validation-exception response:
 * `{ message: "...", errors: { field: ["msg", ...], "nested.field": [...] } }`
 * — already dot-notated for nested fields, matching this library's own
 * `FieldDefinition.name` convention.
 */
function normalizeLaravel(raw: unknown): NormalizedServerErrors {
  const body = asRecord(raw)
  const errors = asRecord(body?.errors) ?? {}
  const fieldErrors: Record<string, string[]> = {}
  for (const [key, value] of Object.entries(errors)) {
    fieldErrors[key] = toStringArray(value)
  }
  return { fieldErrors, formErrors: [] }
}

/**
 * Django REST Framework's default serializer error response — the errors
 * object directly (no wrapper), with nested serializers producing nested
 * objects (flattened here into dot-paths) rather than dotted keys.
 * `non_field_errors` and `detail` are treated as form-level (not tied to
 * a specific field).
 */
function normalizeDRF(raw: unknown): NormalizedServerErrors {
  const fieldErrors: Record<string, string[]> = {}
  const formErrors: string[] = []

  function walk(obj: Record<string, unknown>, prefix: string) {
    for (const [key, value] of Object.entries(obj)) {
      if (key === 'non_field_errors' || key === 'detail') {
        formErrors.push(...toStringArray(value))
        continue
      }
      const path = prefix ? `${prefix}.${key}` : key
      const nested = asRecord(value)
      if (nested) {
        walk(nested, path)
      } else {
        const messages = toStringArray(value)
        if (messages.length) fieldErrors[path] = messages
      }
    }
  }

  const body = asRecord(raw)
  if (body) walk(body, '')
  return { fieldErrors, formErrors }
}

/** Already-flat `{ field: "message" | ["message", ...] }` — the common case for hand-rolled APIs. */
function normalizeFlat(raw: unknown): NormalizedServerErrors {
  const body = asRecord(raw) ?? {}
  const fieldErrors: Record<string, string[]> = {}
  for (const [key, value] of Object.entries(body)) {
    const messages = toStringArray(value)
    if (messages.length) fieldErrors[key] = messages
  }
  return { fieldErrors, formErrors: [] }
}

const FORMATS: Record<ServerErrorFormat, ServerErrorMapper> = {
  laravel: normalizeLaravel,
  drf: normalizeDRF,
  flat: normalizeFlat,
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Normalises a raw server error response body into `{ fieldErrors, formErrors }`
 * without touching a form — use this if you want to inspect/display the
 * result yourself instead of (or in addition to) calling `applyServerErrors`.
 */
export function normalizeServerErrors(
  raw: unknown,
  format: ServerErrorFormat | ServerErrorMapper = 'flat',
): NormalizedServerErrors {
  return typeof format === 'function' ? format(raw) : FORMATS[format](raw)
}

/**
 * Maps a server's validation error response onto a form's `errors` (and,
 * by default, marks the affected fields as touched so the errors are
 * visible right away).
 *
 * Field errors set this way behave like any other entry in `form.errors`:
 * the next time the field is validated client-side (per `validateOn` —
 * on blur by default, on every keystroke with `validateOn: 'input'`), that
 * field's entry is recomputed from the schema's own validators and the
 * server error is naturally replaced/cleared. `submit()` also fully
 * recomputes `errors` for every field, so stale server errors never
 * survive into the next submit attempt.
 *
 * Errors not tied to a specific field (Laravel's top-level `message`,
 * DRF's `non_field_errors` / `detail`) are returned as `formErrors` for
 * you to display wherever makes sense (a toast, a banner) — there's no
 * single input to attach them to.
 *
 * @example
 * const res = await fetch('/api/users', { method: 'POST', body: JSON.stringify(form.values.value) })
 * if (!res.ok) {
 *   const { formErrors } = applyServerErrors(form, await res.json(), { format: 'laravel' })
 *   if (formErrors.length) toast.error(formErrors[0])
 * }
 */
export function applyServerErrors(
  form: UseFormReturn,
  raw: unknown,
  options: ApplyServerErrorsOptions = {},
): NormalizedServerErrors {
  const { format = 'flat', touch = true, merge = true } = options
  const normalized = normalizeServerErrors(raw, format)

  const nextErrors: Record<string, string[]> = merge ? { ...form.errors.value } : {}
  for (const [field, messages] of Object.entries(normalized.fieldErrors)) {
    nextErrors[field] = messages
  }
  form.errors.value = nextErrors

  if (touch) {
    const nextTouched = { ...form.touched.value }
    for (const field of Object.keys(normalized.fieldErrors)) nextTouched[field] = true
    form.touched.value = nextTouched
  }

  return normalized
}
