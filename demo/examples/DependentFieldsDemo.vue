<script setup lang="ts">
import { ref } from 'vue'
import { useForm } from 'vue-form-schema'
import { FormRenderer } from 'vue-form-schema/ui'
import type { FieldDefinition } from 'vue-form-schema'

// ── Sync function options ─────────────────────────────────────────────────────
const syncSchema: FieldDefinition[] = [
  {
    type: 'select',
    name: 'continent',
    label: 'Continent',
    required: true,
    options: [
      { label: 'Europe',        value: 'eu' },
      { label: 'Asia',          value: 'as' },
      { label: 'Americas',      value: 'am' },
    ],
  },
  {
    type: 'select',
    name: 'country',
    label: 'Country',
    required: true,
    options: (values) => {
      const map: Record<string, { label: string; value: string }[]> = {
        eu: [{ label: 'Germany', value: 'de' }, { label: 'France', value: 'fr' }, { label: 'Russia', value: 'ru' }],
        as: [{ label: 'Japan', value: 'jp' }, { label: 'China', value: 'cn' }, { label: 'India', value: 'in' }],
        am: [{ label: 'USA', value: 'us' }, { label: 'Canada', value: 'ca' }, { label: 'Brazil', value: 'br' }],
      }
      return map[values['continent'] as string] ?? []
    },
  },
  {
    type: 'text',
    name: 'city',
    label: 'City',
    placeholder: 'Your city',
    visible: (v) => !!v['country'],
  },
]

const syncForm = useForm({ schema: syncSchema, validateOn: 'blur' })

// ── Async options with loading state ─────────────────────────────────────────
const asyncSchema: FieldDefinition[] = [
  {
    type: 'select',
    name: 'category',
    label: 'Category',
    options: [
      { label: 'Frontend', value: 'frontend' },
      { label: 'Backend',  value: 'backend' },
      { label: 'DevOps',   value: 'devops' },
    ],
  },
  {
    type: 'select',
    name: 'framework',
    label: 'Framework',
    placeholder: 'Select a framework',
    optionsDeps: ['category'],
    options: async (values) => {
      await new Promise((r) => setTimeout(r, 800))
      const map: Record<string, { label: string; value: string }[]> = {
        frontend: [{ label: 'Vue', value: 'vue' }, { label: 'React', value: 'react' }, { label: 'Svelte', value: 'svelte' }],
        backend:  [{ label: 'Node.js', value: 'node' }, { label: 'Go', value: 'go' }, { label: 'Rust', value: 'rust' }],
        devops:   [{ label: 'Docker', value: 'docker' }, { label: 'Kubernetes', value: 'k8s' }, { label: 'Terraform', value: 'tf' }],
      }
      return map[values['category'] as string] ?? []
    },
  },
]

const asyncForm = useForm({ schema: asyncSchema, validateOn: 'blur' })

// ── Computed defaultValue ─────────────────────────────────────────────────────
const defaultSchema: FieldDefinition[] = [
  { type: 'text', name: 'firstName', label: 'First name', defaultValue: 'John' },
  { type: 'text', name: 'lastName',  label: 'Last name',  defaultValue: 'Doe' },
  {
    type: 'text',
    name: 'displayName',
    label: 'Display name (computed default)',
    defaultValue: (values) => `${values.firstName} ${values.lastName}`,
  },
]

const defaultForm = useForm({ schema: defaultSchema, validateOn: 'blur' })
</script>

<template>
  <div>
    <div class="page-header">
      <h2>Dependent fields & dynamic options</h2>
      <p>
        Options can be a sync function, async function (with <code>optionsDeps</code>),
        or <code>defaultValue</code> can be a function that reads other field values.
      </p>
    </div>

    <!-- Sync dependent options -->
    <div class="card">
      <div class="card-title">Sync function options — continent → country → city</div>
      <p style="font-size:0.82rem;color:var(--muted);margin-bottom:16px">
        The <code>country</code> options function fires on every values change.
        The <code>city</code> field is hidden until a country is selected.
      </p>
      <FormRenderer :form="syncForm" submit-label="Continue" />
      <div class="card-title" style="margin-top:16px">Values</div>
      <pre class="values-preview">{{ JSON.stringify(syncForm.values.value, null, 2) }}</pre>
    </div>

    <!-- Async options -->
    <div class="card">
      <div class="card-title">Async options with loading state</div>
      <p style="font-size:0.82rem;color:var(--muted);margin-bottom:16px">
        <code>options</code> returns a <code>Promise</code>. Set <code>optionsDeps: ['category']</code>
        to re-fetch when the dependency changes. The select is disabled during loading.
      </p>
      <FormRenderer :form="asyncForm" submit-label="Select" />
    </div>

    <!-- Computed defaultValue -->
    <div class="card">
      <div class="card-title">Computed defaultValue function</div>
      <p style="font-size:0.82rem;color:var(--muted);margin-bottom:16px">
        <code>defaultValue: (values) =&gt; ...</code> is evaluated at form init with already-resolved defaults as context.
      </p>
      <FormRenderer :form="defaultForm" submit-label="Save" />
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
:deep(.vfs-select-loading) { font-size: 0.85rem; color: var(--muted); padding: 9px 0; }
:deep(.vfs-submit) { display: inline-flex; align-items: center; padding: 9px 20px; background: var(--accent); color: #fff; border: none; border-radius: var(--radius); font-size: 0.875rem; font-weight: 500; cursor: pointer; transition: background 0.15s; margin-top: 8px; }
:deep(.vfs-submit:hover:not(:disabled)) { background: var(--accent-h); }
:deep(.vfs-submit:disabled) { opacity: 0.45; cursor: not-allowed; }
</style>
