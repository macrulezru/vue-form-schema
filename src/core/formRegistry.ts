import type { UseFormReturn } from './types'

/**
 * Lightweight, dependency-free registry of active `useForm()` instances and
 * a matching event bus — the data source for the optional DevTools plugin
 * (`vue-form-schema/devtools`). Deliberately has zero `@vue/devtools-api`
 * import anywhere in this file, or anywhere `useForm` touches, so devtools
 * support costs nothing in the core bundle: `emitFormEvent` is a no-op
 * (one `Set.size` check) whenever nothing is listening, i.e. whenever the
 * devtools plugin isn't installed.
 */

export interface RegisteredForm {
  id: number
  label: string
  form: UseFormReturn
  createdAt: number
}

export type FormEventType =
  'setField' | 'touch' | 'submit' | 'submitSuccess' | 'submitError' | 'reset' | 'asyncValidate'

export interface FormEvent {
  formId: number
  type: FormEventType
  payload?: Record<string, unknown>
  time: number
}

type Listener = (event: FormEvent) => void

let nextId = 1
const forms = new Map<number, RegisteredForm>()
const listeners = new Set<Listener>()

export function registerForm(form: UseFormReturn, label: string): number {
  const id = nextId++
  forms.set(id, { id, label, form, createdAt: Date.now() })
  return id
}

export function unregisterForm(id: number): void {
  forms.delete(id)
}

export function getRegisteredForm(id: number): RegisteredForm | undefined {
  return forms.get(id)
}

export function getRegisteredForms(): RegisteredForm[] {
  return Array.from(forms.values())
}

export function emitFormEvent(
  formId: number,
  type: FormEventType,
  payload?: Record<string, unknown>,
): void {
  if (listeners.size === 0) return
  const event: FormEvent = { formId, type, payload, time: Date.now() }
  for (const listener of listeners) listener(event)
}

/** Subscribes to form events; returns an unsubscribe function. */
export function onFormEvent(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
