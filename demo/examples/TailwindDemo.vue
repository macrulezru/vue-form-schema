<script setup lang="ts">
import { ref } from 'vue'
import { useForm } from 'vue-form-schema'
import { FormRenderer } from 'vue-form-schema/ui'
import { TailwindFormRenderer } from 'vue-form-schema/ui/tailwind'
import type { FieldDefinition } from 'vue-form-schema'

const schema: FieldDefinition[] = [
  { type: 'text',     name: 'name',     label: 'Full name',   required: true, placeholder: 'Alice Smith' },
  { type: 'email',    name: 'email',    label: 'Email',       required: true, placeholder: 'alice@example.com' },
  {
    type: 'select', name: 'role', label: 'Role',
    options: [
      { label: 'Developer', value: 'dev' },
      { label: 'Designer',  value: 'design' },
      { label: 'Manager',   value: 'mgr' },
    ],
  },
  { type: 'radio', name: 'plan', label: 'Plan', defaultValue: 'free',
    options: [
      { label: 'Free',    value: 'free'  },
      { label: 'Pro',     value: 'pro'   },
      { label: 'Enterprise', value: 'ent' },
    ],
  },
  { type: 'checkbox', name: 'newsletter', label: 'Subscribe to newsletter' },
  { type: 'textarea', name: 'bio', label: 'Short bio', placeholder: 'Tell us a bit about yourself…' },
]

const submitted = ref<Record<string, unknown> | null>(null)

const defaultForm = useForm({
  schema,
  validateOn: 'blur',
  onSubmit: async (data) => { submitted.value = data },
})

const twForm = useForm({
  schema,
  validateOn: 'blur',
  onSubmit: async (data) => { submitted.value = data },
})
</script>

<template>
  <div>
    <div class="page-header">
      <h2>Tailwind UI theme</h2>
      <p>
        <code>TailwindFormRenderer</code> from <code>vue-form-schema/ui/tailwind</code> renders
        identical schemas using Tailwind utility classes — no custom CSS required in your app.
      </p>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
      <!-- Default theme -->
      <div class="card">
        <div class="card-title">Default theme (BEM classes)</div>
        <p style="font-size:0.78rem;color:var(--muted);margin-bottom:16px">
          <code>FormRenderer</code> from <code>vue-form-schema/ui</code>
        </p>
        <FormRenderer :form="defaultForm" submit-label="Submit (default)" />
        <div v-if="submitted" class="toast">✅ Submitted</div>
      </div>

      <!-- Tailwind theme -->
      <div class="card">
        <div class="card-title">Tailwind theme</div>
        <p style="font-size:0.78rem;color:var(--muted);margin-bottom:16px">
          <code>TailwindFormRenderer</code> from <code>vue-form-schema/ui/tailwind</code>
        </p>
        <TailwindFormRenderer :form="twForm" submit-label="Submit (Tailwind)" />
      </div>
    </div>

    <!-- Import snippet -->
    <div class="card">
      <div class="card-title">Usage</div>
      <pre class="code-block">import { TailwindFormRenderer } from 'vue-form-schema/ui/tailwind'

// Same schema, same form composable — just swap the renderer
&lt;TailwindFormRenderer :form="form" submit-label="Save" /&gt;

// Override individual field types
&lt;TailwindFormRenderer :form="form" :components="{ text: MyInput }" /&gt;</pre>
    </div>
  </div>
</template>

<style scoped>
/* Default theme styles for the left panel */
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
:deep(.vfs-checkbox-label), :deep(.vfs-radio-label) { display: flex !important; align-items: center; gap: 8px; cursor: pointer; font-size: 0.9rem; font-weight: 400; color: var(--text); text-transform: none; letter-spacing: normal; }
:deep(.vfs-radio), :deep(.vfs-checkbox) { width: 16px; height: 16px; flex-shrink: 0; cursor: pointer; accent-color: var(--accent); }
:deep(.vfs-submit) { display: inline-flex; align-items: center; padding: 9px 20px; background: var(--accent); color: #fff; border: none; border-radius: var(--radius); font-size: 0.875rem; font-weight: 500; cursor: pointer; transition: background 0.15s; margin-top: 8px; }
:deep(.vfs-submit:hover:not(:disabled)) { background: var(--accent-h); }
</style>
