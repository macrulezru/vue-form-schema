<script setup lang="ts">
import { ref } from 'vue'
import { useMultiStepForm } from 'vue-form-schema'
import { MultiStepFormRenderer } from 'vue-form-schema/ui'
import type { FieldDefinition } from 'vue-form-schema'

// ── Step definitions ──────────────────────────────────────────────────────────
const steps = [
  {
    title: 'Account',
    schema: [
      { type: 'text',  name: 'username', label: 'Username',  required: true },
      { type: 'email', name: 'email',    label: 'Email',     required: true },
      { type: 'text',  name: 'password', label: 'Password',  required: true },
    ] as FieldDefinition[],
  },
  {
    title: 'Profile',
    schema: [
      { type: 'text',   name: 'firstName', label: 'First name', required: true },
      { type: 'text',   name: 'lastName',  label: 'Last name',  required: true },
      { type: 'select', name: 'country',   label: 'Country',
        options: [
          { label: 'Russia',         value: 'ru' },
          { label: 'United States',  value: 'us' },
          { label: 'Germany',        value: 'de' },
        ],
      },
      { type: 'date', name: 'birthDate', label: 'Date of birth' },
    ] as FieldDefinition[],
  },
  {
    title: 'Preferences',
    schema: [
      { type: 'radio',    name: 'theme', label: 'UI theme', defaultValue: 'system',
        options: [
          { label: 'Light',  value: 'light' },
          { label: 'Dark',   value: 'dark' },
          { label: 'System', value: 'system' },
        ],
      },
      { type: 'checkbox', name: 'newsletter', label: 'Subscribe to newsletter' },
      { type: 'checkbox', name: 'terms',      label: 'I agree to the terms', required: true,
        validators: [(v) => v !== true ? 'You must accept the terms' : null],
      },
    ] as FieldDefinition[],
  },
]

const submitted = ref<Record<string, unknown> | null>(null)

const wizard = useMultiStepForm(steps, async (allValues) => {
  await new Promise((r) => setTimeout(r, 800))
  submitted.value = allValues
})
</script>

<template>
  <div>
    <div class="page-header">
      <h2>Multi-step wizard form</h2>
      <p>
        <code>useMultiStepForm</code> manages per-step validation, navigation, and final submit.
        <code>MultiStepFormRenderer</code> renders the step UI automatically.
      </p>
    </div>

    <div v-if="!submitted">
      <!-- Step progress indicator -->
      <div class="card" style="padding:16px 24px">
        <div style="display:flex;align-items:center;gap:0">
          <template v-for="(step, i) in wizard.steps" :key="i">
            <div
              style="display:flex;flex-direction:column;align-items:center;gap:4px;flex:1"
            >
              <div
                style="width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.8rem;font-weight:600;border:2px solid;transition:all 0.2s"
                :style="{
                  background: wizard.currentStep.value > i ? 'var(--accent)' : (wizard.currentStep.value === i ? 'transparent' : 'transparent'),
                  borderColor: wizard.currentStep.value >= i ? 'var(--accent)' : 'var(--border)',
                  color: wizard.currentStep.value >= i ? (wizard.currentStep.value === i ? 'var(--accent)' : '#fff') : 'var(--muted)',
                }"
              >
                {{ wizard.currentStep.value > i ? '✓' : i + 1 }}
              </div>
              <span style="font-size:0.7rem;color:var(--muted)">{{ step.title }}</span>
            </div>
            <div
              v-if="i < wizard.steps.length - 1"
              style="flex:1;height:2px;margin-bottom:20px;transition:background 0.2s"
              :style="{ background: wizard.currentStep.value > i ? 'var(--accent)' : 'var(--border)' }"
            />
          </template>
        </div>
      </div>

      <!-- MultiStepFormRenderer for automatic rendering -->
      <div class="card">
        <div class="card-title">Step {{ wizard.currentStep.value + 1 }}: {{ wizard.steps[wizard.currentStep.value].title }}</div>
        <MultiStepFormRenderer :form="wizard" />
      </div>
    </div>

    <div v-else class="card">
      <div class="card-title">✅ Registration complete!</div>
      <pre class="values-preview">{{ JSON.stringify(submitted, null, 2) }}</pre>
      <button class="btn btn-ghost" style="margin-top:16px" @click="submitted = null; wizard.goTo(0)">
        Start over
      </button>
    </div>
  </div>
</template>

<style scoped>
:deep(.vfs-field) { margin-bottom: 16px; }
:deep(.vfs-field__label) { display: block; font-size: 0.8rem; font-weight: 500; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 6px; }
:deep(.vfs-field__required) { color: var(--error); margin-left: 2px; }
:deep(.vfs-field__errors) { list-style: none; }
:deep(.vfs-field__error) { font-size: 0.78rem; color: var(--error); margin-top: 4px; }
:deep(.vfs-input), :deep(.vfs-textarea), :deep(.vfs-select) {
  width: 100%; padding: 9px 12px; background: var(--code-bg);
  border: 1px solid var(--border); border-radius: var(--radius);
  color: var(--text); font-family: var(--font); font-size: 0.9rem; outline: none; transition: border-color 0.15s;
}
:deep(.vfs-input:focus), :deep(.vfs-textarea:focus), :deep(.vfs-select:focus) { border-color: var(--accent); }
:deep(.vfs-field--error .vfs-input), :deep(.vfs-field--error .vfs-select) { border-color: var(--error); }
:deep(.vfs-radio-group) { display: flex; flex-direction: column; gap: 10px; }
:deep(.vfs-radio-label), :deep(.vfs-checkbox-label) { display: flex !important; align-items: center; gap: 8px; cursor: pointer; font-size: 0.9rem; font-weight: 400; color: var(--text); text-transform: none; letter-spacing: normal; }
:deep(.vfs-radio), :deep(.vfs-checkbox) { width: 16px; height: 16px; flex-shrink: 0; cursor: pointer; accent-color: var(--accent); }
:deep(.vfs-multistep-nav) { display: flex; gap: 10px; margin-top: 20px; }
:deep(.vfs-step-back), :deep(.vfs-step-next), :deep(.vfs-step-submit) {
  display: inline-flex; align-items: center; padding: 9px 20px;
  border-radius: var(--radius); font-size: 0.875rem; font-weight: 500; cursor: pointer; border: none; transition: all 0.15s;
}
:deep(.vfs-step-back) { background: transparent; color: var(--muted); border: 1px solid var(--border); }
:deep(.vfs-step-back:hover) { color: var(--text); border-color: var(--text); }
:deep(.vfs-step-next), :deep(.vfs-step-submit) { background: var(--accent); color: #fff; }
:deep(.vfs-step-next:hover), :deep(.vfs-step-submit:hover) { background: var(--accent-h); }
:deep(.vfs-step-next:disabled), :deep(.vfs-step-submit:disabled) { opacity: 0.45; cursor: not-allowed; }
</style>
