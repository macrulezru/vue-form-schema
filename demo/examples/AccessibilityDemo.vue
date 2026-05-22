<script setup lang="ts">
import { ref } from 'vue'
import { useForm, required, minLength } from 'vue-form-schema'
import { FormRenderer } from 'vue-form-schema/ui'
import type { FieldDefinition } from 'vue-form-schema'

const schema: FieldDefinition[] = [
  {
    type: 'text',
    name: 'fullName',
    label: 'Full name',
    required: true,
    validators: [minLength(2)],
  },
  {
    type: 'email',
    name: 'email',
    label: 'Email address',
    required: true,
  },
  {
    type: 'select',
    name: 'role',
    label: 'Role',
    required: true,
    options: [
      { label: 'Developer', value: 'dev' },
      { label: 'Designer',  value: 'design' },
    ],
  },
  {
    type: 'radio',
    name: 'level',
    label: 'Experience level',
    required: true,
    options: [
      { label: 'Junior', value: 'jr' },
      { label: 'Mid',    value: 'mid' },
      { label: 'Senior', value: 'sr' },
    ],
  },
  {
    type: 'checkbox',
    name: 'agreed',
    label: 'I agree to the terms of service',
    required: true,
    validators: [(v) => (v !== true ? 'You must agree to continue' : null)],
  },
]

const submitted = ref(false)
const form = useForm({
  schema,
  validateOn: 'blur',
  onSubmit: async () => { submitted.value = true },
})
</script>

<template>
  <div>
    <div class="page-header">
      <h2>Accessibility (a11y)</h2>
      <p>
        All built-in field components include <code>aria-required</code>, <code>aria-invalid</code>,
        and <code>aria-describedby</code> linked to the error element. Radio groups use
        <code>&lt;fieldset&gt;</code> + <code>&lt;legend&gt;</code>. Inspect the DOM to verify.
      </p>
    </div>

    <!-- Live demo -->
    <div class="card">
      <div class="card-title">Accessible form — submit to trigger errors</div>
      <p style="font-size:0.82rem;color:var(--muted);margin-bottom:16px">
        Submit without filling the form to see errors announced via <code>role="alert"</code>
        and fields marked as <code>aria-invalid="true"</code>.
      </p>

      <FormRenderer v-if="!submitted" :form="form" submit-label="Create account" />
      <div v-else class="toast">✅ Account created!</div>
    </div>

    <!-- a11y feature list -->
    <div class="card">
      <div class="card-title">Implemented a11y features</div>
      <ul style="list-style:none;display:flex;flex-direction:column;gap:10px">
        <li v-for="item in a11yItems" :key="item.feature" style="display:flex;gap:12px;align-items:flex-start">
          <span style="color:var(--success);font-size:1rem;flex-shrink:0">✓</span>
          <div>
            <div style="font-size:0.88rem;font-weight:500;color:var(--text)">{{ item.feature }}</div>
            <div style="font-size:0.78rem;color:var(--muted);margin-top:2px">{{ item.detail }}</div>
          </div>
        </li>
      </ul>
    </div>

    <!-- DOM snippet -->
    <div class="card">
      <div class="card-title">Rendered DOM (example — fullName after error)</div>
      <pre class="code-block">&lt;div class="vfs-field vfs-field--text vfs-field--error"&gt;
  &lt;label for="fullName"&gt;Full name &lt;span aria-hidden="true"&gt;*&lt;/span&gt;&lt;/label&gt;
  &lt;input
    id="fullName"
    type="text"
    aria-required="true"
    aria-invalid="true"
    aria-describedby="fullName-error"
  /&gt;
  &lt;ul id="fullName-error" role="alert" aria-live="polite"&gt;
    &lt;li&gt;This field is required&lt;/li&gt;
  &lt;/ul&gt;
&lt;/div&gt;

&lt;!-- Radio groups use fieldset/legend --&gt;
&lt;fieldset aria-required="true" aria-invalid="false"&gt;
  &lt;legend&gt;Experience level *&lt;/legend&gt;
  &lt;div&gt;&lt;label&gt;&lt;input type="radio" name="level" /&gt; Junior&lt;/label&gt;&lt;/div&gt;
  …
&lt;/fieldset&gt;</pre>
    </div>
  </div>
</template>

<script lang="ts">
const a11yItems = [
  { feature: 'aria-required', detail: 'Set to "true" on required inputs/selects/textareas/fieldsets' },
  { feature: 'aria-invalid', detail: 'Set to "true" when the field is touched and has errors' },
  { feature: 'aria-describedby', detail: 'Links input to its error list via id="{name}-error"' },
  { feature: 'role="alert" + aria-live="polite"', detail: 'Error messages are announced by screen readers on appearance' },
  { feature: 'label[for] + input[id]', detail: 'All inputs have matching label[for] and id attributes' },
  { feature: 'fieldset + legend for radio groups', detail: 'Radio groups are wrapped in <fieldset> with <legend> as the group label' },
  { feature: 'aria-checked on checkboxes', detail: 'Native checkboxes have explicit aria-checked reflecting the boolean value' },
]
</script>

<style scoped>
:deep(.vfs-field) { margin-bottom: 16px; }
:deep(.vfs-field__label) { display: block; font-size: 0.8rem; font-weight: 500; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 6px; }
:deep(.vfs-field__required) { color: var(--error); margin-left: 2px; }
:deep(.vfs-field__errors) { list-style: none; }
:deep(.vfs-field__error) { font-size: 0.78rem; color: var(--error); margin-top: 4px; }
:deep(.vfs-input), :deep(.vfs-select) {
  width: 100%; padding: 9px 12px; background: var(--code-bg);
  border: 1px solid var(--border); border-radius: var(--radius);
  color: var(--text); font-family: var(--font); font-size: 0.9rem; outline: none; transition: border-color 0.15s;
}
:deep(.vfs-input:focus), :deep(.vfs-select:focus) { border-color: var(--accent); }
:deep(.vfs-field--error .vfs-input), :deep(.vfs-field--error .vfs-select) { border-color: var(--error); }
:deep(.vfs-radio-group) { display: flex; flex-direction: column; gap: 10px; }
:deep(.vfs-radio-label), :deep(.vfs-checkbox-label) { display: flex !important; align-items: center; gap: 8px; cursor: pointer; font-size: 0.9rem; font-weight: 400; color: var(--text); text-transform: none; letter-spacing: normal; }
:deep(.vfs-radio), :deep(.vfs-checkbox) { width: 16px; height: 16px; flex-shrink: 0; cursor: pointer; accent-color: var(--accent); }
:deep(fieldset.vfs-field) { border: none; padding: 0; margin: 0 0 16px; min-width: 0; }
:deep(fieldset.vfs-field legend) { padding: 0; }
:deep(.vfs-submit) { display: inline-flex; align-items: center; padding: 9px 20px; background: var(--accent); color: #fff; border: none; border-radius: var(--radius); font-size: 0.875rem; font-weight: 500; cursor: pointer; margin-top: 8px; }
:deep(.vfs-submit:hover:not(:disabled)) { background: var(--accent-h); }
:deep(.vfs-submit:disabled) { opacity: 0.45; cursor: not-allowed; }
</style>
