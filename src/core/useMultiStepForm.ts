import { ref, computed } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import { useForm } from './useForm'
import type { UseFormConfig, UseFormReturn } from './types'

export interface MultiStepFormReturn {
  currentStep: Ref<number>
  totalSteps: number
  isFirstStep: ComputedRef<boolean>
  isLastStep: ComputedRef<boolean>
  /** The active step's form instance */
  form: ComputedRef<UseFormReturn>
  /** All step form instances */
  steps: UseFormReturn[]
  /** Merged values from all steps */
  values: ComputedRef<Record<string, unknown>>
  isValid: ComputedRef<boolean>
  isSubmitting: ComputedRef<boolean>
  /** Validate current step and advance. Returns false if validation fails. */
  next(): Promise<boolean>
  back(): void
  goTo(step: number): void
  submit(): Promise<void>
}

/**
 * Manages a multi-step form. Each step is an independent `useForm` instance.
 * Must be called inside a component `setup()`.
 *
 * @param stepConfigs - Array of useForm configs (without onSubmit — handled centrally)
 * @param onSubmit - Called with merged values from all steps when the last step is submitted
 */
export function useMultiStepForm(
  stepConfigs: Omit<UseFormConfig, 'onSubmit'>[],
  onSubmit?: (values: Record<string, unknown>) => void | Promise<void>,
): MultiStepFormReturn {
  // Each call to useForm registers its own onUnmounted cleanup on the current component
  const steps = stepConfigs.map((config) => useForm(config))

  const currentStep = ref(0)
  const totalSteps = steps.length

  const isFirstStep = computed(() => currentStep.value === 0)
  const isLastStep = computed(() => currentStep.value === totalSteps - 1)
  const form = computed(() => steps[currentStep.value])

  const values = computed(() =>
    steps.reduce(
      (acc, step) => ({ ...acc, ...(step.values.value as Record<string, unknown>) }),
      {} as Record<string, unknown>,
    ),
  )

  const isValid = computed(() => steps.every((s) => s.isValid.value))
  const isSubmitting = computed(() => steps.some((s) => s.isSubmitting.value))

  async function next(): Promise<boolean> {
    // submit() on a step form validates all its fields and marks them touched.
    // Step forms have no onSubmit, so it is a pure validation run.
    await steps[currentStep.value].submit()
    const hasErrors = Object.values(steps[currentStep.value].errors.value).some(
      (e) => e.length > 0,
    )
    if (hasErrors) return false
    if (!isLastStep.value) currentStep.value++
    return true
  }

  function back() {
    if (!isFirstStep.value) currentStep.value--
  }

  function goTo(step: number) {
    if (step >= 0 && step < totalSteps) currentStep.value = step
  }

  async function submit() {
    // Validate every step in order
    for (const step of steps) {
      await step.submit()
      const hasErrors = Object.values(step.errors.value).some((e) => e.length > 0)
      if (hasErrors) return
    }
    await onSubmit?.(values.value)
  }

  return {
    currentStep,
    totalSteps,
    isFirstStep,
    isLastStep,
    form,
    steps,
    values,
    isValid,
    isSubmitting,
    next,
    back,
    goTo,
    submit,
  }
}
