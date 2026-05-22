import type { FieldDefinition, ValidatorFn, AsyncValidatorFn } from './types'

// ─── Built-in validators ──────────────────────────────────────────────────────

export const required: ValidatorFn = (value) => {
  if (value === null || value === undefined || value === '') return 'This field is required'
  if (Array.isArray(value) && value.length === 0) return 'This field is required'
  return null
}

export const minLength =
  (min: number, message?: string): ValidatorFn =>
  (value) => {
    if (typeof value !== 'string' && !Array.isArray(value)) return null
    return (value as string | unknown[]).length >= min
      ? null
      : (message ?? `Minimum length is ${min}`)
  }

export const maxLength =
  (max: number, message?: string): ValidatorFn =>
  (value) => {
    if (typeof value !== 'string' && !Array.isArray(value)) return null
    return (value as string | unknown[]).length <= max
      ? null
      : (message ?? `Maximum length is ${max}`)
  }

export const min =
  (minVal: number, message?: string): ValidatorFn =>
  (value) => {
    const n = Number(value)
    if (isNaN(n)) return null
    return n >= minVal ? null : (message ?? `Minimum value is ${minVal}`)
  }

export const max =
  (maxVal: number, message?: string): ValidatorFn =>
  (value) => {
    const n = Number(value)
    if (isNaN(n)) return null
    return n <= maxVal ? null : (message ?? `Maximum value is ${maxVal}`)
  }

export const pattern =
  (regex: RegExp, message?: string): ValidatorFn =>
  (value) => {
    if (typeof value !== 'string') return null
    return regex.test(value) ? null : (message ?? `Invalid format`)
  }

export const email: ValidatorFn = (value) => {
  if (!value) return null
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(String(value)) ? null : 'Invalid email address'
}

export const url: ValidatorFn = (value) => {
  if (!value) return null
  try {
    new URL(String(value))
    return null
  } catch {
    return 'Invalid URL'
  }
}

// ─── ValidationEngine ─────────────────────────────────────────────────────────

export class ValidationEngine {
  private asyncTimers = new Map<string, ReturnType<typeof setTimeout>>()
  private readonly debounceMs: number

  constructor(debounceMs = 300) {
    this.debounceMs = debounceMs
  }

  /** Run sync validators for a single field; returns list of error messages */
  validateField(
    field: FieldDefinition,
    value: unknown,
    allValues: Record<string, unknown>,
  ): string[] {
    const errors: string[] = []

    if (field.required) {
      const msg = required(value, allValues)
      if (msg) errors.push(msg)
    }

    for (const validator of field.validators ?? []) {
      const msg = validator(value, allValues)
      if (msg) errors.push(msg)
    }

    return errors
  }

  /** Run all sync validators across all visible fields */
  validateAll(
    fields: FieldDefinition[],
    values: Record<string, unknown>,
  ): Record<string, string[]> {
    const errors: Record<string, string[]> = {}
    this.collectErrors(fields, values, errors)
    return errors
  }

  private collectErrors(
    fields: FieldDefinition[],
    values: Record<string, unknown>,
    errors: Record<string, string[]>,
  ) {
    for (const field of fields) {
      const value = getByPath(values, field.name)
      const fieldErrors = this.validateField(field, value, values)
      if (fieldErrors.length) errors[field.name] = fieldErrors

      if ((field.type === 'group' || field.type === 'array') && field.fields) {
        this.collectErrors(field.fields, values, errors)
      }
    }
  }

  /** Run async validators with debounce; calls onResult when done */
  validateAsync(
    field: FieldDefinition,
    value: unknown,
    allValues: Record<string, unknown>,
    onResult: (path: string, errors: string[]) => void,
  ): void {
    if (!field.asyncValidators?.length) return

    const existing = this.asyncTimers.get(field.name)
    if (existing) clearTimeout(existing)

    const timer = setTimeout(async () => {
      const results = await Promise.all(
        (field.asyncValidators as AsyncValidatorFn[]).map((fn) => fn(value, allValues)),
      )
      const errors = results.filter((r): r is string => r !== null)
      onResult(field.name, errors)
      this.asyncTimers.delete(field.name)
    }, this.debounceMs)

    this.asyncTimers.set(field.name, timer)
  }

  destroy() {
    for (const timer of this.asyncTimers.values()) clearTimeout(timer)
    this.asyncTimers.clear()
  }
}

// ─── Path helpers ─────────────────────────────────────────────────────────────

export function getByPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key]
    return undefined
  }, obj)
}

export function setByPath(
  obj: Record<string, unknown>,
  path: string,
  value: unknown,
): Record<string, unknown> {
  const keys = path.split('.')
  const result = { ...obj }
  let current: Record<string, unknown> = result

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]
    current[key] = current[key] && typeof current[key] === 'object'
      ? { ...(current[key] as Record<string, unknown>) }
      : {}
    current = current[key] as Record<string, unknown>
  }

  current[keys[keys.length - 1]] = value
  return result
}
