<script setup lang="ts">
import { ref, defineComponent, h } from 'vue'
import { useForm, provideRegistry } from 'vue-form-schema'
import { FormRenderer } from 'vue-form-schema/ui'
import type { FieldDefinition, FormFieldProps } from 'vue-form-schema'

// ── Custom "pill toggle" component for boolean fields ─────────────────────────
const PillToggle = defineComponent({
  name: 'PillToggle',
  props: {
    field: { type: Object as () => FieldDefinition, required: true },
    modelValue: { default: false },
    error: { type: Array as () => string[], default: () => [] },
    touched: { type: Boolean, default: false },
  },
  emits: ['update:modelValue', 'blur'],
  setup(props, { emit }) {
    return () =>
      h('div', { style: 'margin-bottom:16px' }, [
        props.field.label
          ? h('div', {
              style: 'font-size:0.8rem;font-weight:500;color:var(--muted);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:8px',
            }, props.field.label)
          : null,
        h('button', {
          type: 'button',
          style: `display:inline-flex;align-items:center;gap:8px;padding:6px 14px;border-radius:999px;font-size:0.85rem;font-weight:500;border:none;cursor:pointer;transition:all 0.15s;
            background:${props.modelValue ? 'var(--accent)' : 'var(--code-bg)'};
            color:${props.modelValue ? '#fff' : 'var(--muted)'};
            box-shadow: 0 0 0 1px ${props.modelValue ? 'var(--accent)' : 'var(--border)'}`,
          onClick: () => { emit('update:modelValue', !props.modelValue); emit('blur') },
        }, [
          h('span', {
            style: `width:8px;height:8px;border-radius:50%;background:${props.modelValue ? '#fff' : 'var(--muted)'}`,
          }),
          props.modelValue ? 'Enabled' : 'Disabled',
        ]),
      ])
  },
})

// ── Provide the custom component for the 'checkbox' type ─────────────────────
provideRegistry({ checkbox: PillToggle })

const schema: FieldDefinition[] = [
  { type: 'text',     name: 'service', label: 'Service name', required: true, placeholder: 'My API' },
  { type: 'checkbox', name: 'enabled',    label: 'Service enabled' },
  { type: 'checkbox', name: 'monitoring', label: 'Monitoring' },
  { type: 'checkbox', name: 'logging',    label: 'Logging' },
  { type: 'select',   name: 'region', label: 'Region',
    options: [
      { label: 'EU West',   value: 'eu-west' },
      { label: 'US East',   value: 'us-east' },
      { label: 'Asia',      value: 'asia' },
    ],
  },
]

const submitted = ref<Record<string, unknown> | null>(null)

const form = useForm({
  schema,
  validateOn: 'blur',
  onSubmit: async (data) => { submitted.value = data },
})
</script>

<template>
  <div>
    <div class="page-header">
      <h2>Custom component registry</h2>
      <p>
        Use <code>provideRegistry</code> to replace built-in field renderers for the current
        component subtree. Here all <code>checkbox</code> fields use a custom pill toggle.
      </p>
    </div>

    <div class="card">
      <div class="card-title">PillToggle replaces all checkboxes</div>
      <pre class="code-block" style="margin-bottom:16px">provideRegistry({ checkbox: PillToggle })</pre>
      <FormRenderer :form="form" submit-label="Deploy" />
      <div v-if="submitted" class="toast">
        ✅ Deployed "{{ submitted.service }}" to {{ submitted.region }}
      </div>
    </div>

    <!-- field.component overrides registry -->
    <div class="card">
      <div class="card-title">field.component takes priority over registry</div>
      <p style="font-size:0.82rem;color:var(--muted);margin-bottom:16px">
        Pass <code>component: MyComponent</code> directly on a field definition to override
        the registry for that specific field only.
      </p>
      <pre class="code-block">const schema = [
  {
    type: 'checkbox',
    name: 'agree',
    component: MySpecialToggle,   // overrides registry for this field only
  },
]</pre>
    </div>

    <div class="card">
      <div class="card-title">Live values</div>
      <pre class="values-preview">{{ JSON.stringify(form.values.value, null, 2) }}</pre>
    </div>
  </div>
</template>

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
:deep(.vfs-submit) { display: inline-flex; align-items: center; padding: 9px 20px; background: var(--accent); color: #fff; border: none; border-radius: var(--radius); font-size: 0.875rem; font-weight: 500; cursor: pointer; margin-top: 8px; }
:deep(.vfs-submit:hover:not(:disabled)) { background: var(--accent-h); }
</style>
