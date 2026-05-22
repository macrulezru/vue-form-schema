import { computed } from 'vue'
import type { FormFieldProps } from './types'

/**
 * Helper composable for custom field component authors.
 * Provides computed shortcuts and a typed emit helper.
 *
 * Usage in a custom field component:
 *   const props = defineProps<FormFieldProps>()
 *   const emit = defineEmits<{ 'update:modelValue': [value: unknown]; blur: [] }>()
 *   const { hasError, errorMessage } = useFormField(props)
 */
export function useFormField(props: FormFieldProps) {
  const hasError = computed(() => props.touched && props.error.length > 0)
  const errorMessage = computed(() => (hasError.value ? props.error[0] : null))
  const allErrors = computed(() => (props.touched ? props.error : []))
  const isRequired = computed(() => props.field.required ?? false)
  const isDisabled = computed(() =>
    typeof props.field.disabled === 'boolean' ? props.field.disabled : false,
  )

  return { hasError, errorMessage, allErrors, isRequired, isDisabled }
}
