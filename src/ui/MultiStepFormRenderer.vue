<script setup lang="ts">
import { type Component } from 'vue'
import type { FieldDefinition } from '../core/types'
import type { MultiStepFormReturn } from '../core/useMultiStepForm'
import FormRenderer from './FormRenderer.vue'

const props = defineProps<{
  form: MultiStepFormReturn
  components?: Partial<Record<FieldDefinition['type'], Component | string>>
  submitLabel?: string
  nextLabel?: string
  backLabel?: string
  stepLabels?: string[]
}>()

const emit = defineEmits<{ submit: [] }>()

async function onNext() {
  await props.form.next()
}

async function onSubmit() {
  await props.form.submit()
  emit('submit')
}
</script>

<template>
  <div class="vfs-multistep">
    <!-- Step indicator -->
    <div class="vfs-multistep__steps">
      <div
        v-for="(_, i) in form.steps"
        :key="i"
        class="vfs-multistep__step"
        :class="{
          'vfs-multistep__step--active': i === form.currentStep.value,
          'vfs-multistep__step--done': i < form.currentStep.value,
        }"
      >
        <span class="vfs-multistep__step-number">{{ i + 1 }}</span>
        <span v-if="stepLabels?.[i]" class="vfs-multistep__step-label">{{ stepLabels[i] }}</span>
      </div>
    </div>

    <div class="vfs-multistep__progress">
      Step {{ form.currentStep.value + 1 }} of {{ form.totalSteps }}
    </div>

    <!-- Current step's form fields, navigation replaces submit slot -->
    <FormRenderer :form="form.form.value" :components="components">
      <template #submit>
        <div class="vfs-multistep__nav">
          <button
            v-if="!form.isFirstStep.value"
            type="button"
            class="vfs-multistep__back"
            @click="form.back()"
          >
            {{ backLabel ?? '← Back' }}
          </button>
          <button
            v-if="!form.isLastStep.value"
            type="button"
            class="vfs-multistep__next"
            @click="onNext"
          >
            {{ nextLabel ?? 'Next →' }}
          </button>
          <button
            v-else
            type="button"
            class="vfs-submit"
            :disabled="form.isSubmitting.value"
            @click="onSubmit"
          >
            {{ submitLabel ?? 'Submit' }}
          </button>
        </div>
      </template>
    </FormRenderer>
  </div>
</template>
