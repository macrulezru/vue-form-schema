import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import type { UseFormReturn, FieldDefinition } from './types'

export interface FormSnapshot {
  values: Record<string, unknown>
  errors: Record<string, string[]>
  touched: Record<string, boolean>
  isDirty: boolean
  isValid: boolean
  isSubmitting: boolean
  optionsLoading: Record<string, boolean>
  fields: Array<{ name: string; visible: unknown; disabled: unknown }>
}

/**
 * Returns a reactive snapshot of all form state — useful for debugging
 * or building a DevTools-style inspector panel.
 *
 * @example
 * const form = useForm({ schema })
 * const { snapshot } = useFormDebug(form)
 * // render snapshot in a <pre> tag during development
 */
export function useFormDebug(form: UseFormReturn): { snapshot: ComputedRef<FormSnapshot> } {
  const snapshot = computed<FormSnapshot>(() => ({
    values: JSON.parse(JSON.stringify(form.values.value)) as Record<string, unknown>,
    errors: form.errors.value,
    touched: form.touched.value,
    isDirty: form.isDirty.value,
    isValid: form.isValid.value,
    isSubmitting: form.isSubmitting.value,
    optionsLoading: form.optionsLoading.value,
    fields: form.fields.value.map((f: FieldDefinition) => ({
      name: f.name,
      visible: f.visible,
      disabled: f.disabled,
    })),
  }))

  return { snapshot }
}
