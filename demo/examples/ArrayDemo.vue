<script setup lang="ts">
import { ref } from 'vue'
import { useForm, useFieldArray } from 'vue-form-schema'
import { FormRenderer } from 'vue-form-schema/ui'
import type { FieldDefinition } from 'vue-form-schema'

// ── Schema with an array field ────────────────────────────────��───────────────
const schema: FieldDefinition[] = [
  { type: 'text', name: 'projectName', label: 'Project name', required: true },
  {
    type: 'array',
    name: 'members',
    label: 'Team members',
    fields: [
      { type: 'text',   name: 'members.name',  label: 'Full name',   required: true },
      { type: 'email',  name: 'members.email', label: 'Email',       required: true },
      { type: 'select', name: 'members.role',  label: 'Role',
        options: [
          { label: 'Developer', value: 'dev' },
          { label: 'Designer',  value: 'design' },
          { label: 'Manager',   value: 'mgr' },
        ],
      },
    ],
  },
]

const submitted = ref<Record<string, unknown> | null>(null)

const form = useForm({
  schema,
  validateOn: 'blur',
  onSubmit: async (data) => {
    await new Promise((r) => setTimeout(r, 600))
    submitted.value = data
  },
})

// ── useFieldArray for manual control ─────────────────────────────────────────
const memberArray = useFieldArray(form, 'members')
</script>

<template>
  <div>
    <div class="page-header">
      <h2>Dynamic array fields</h2>
      <p>
        Use <code>type: 'array'</code> in your schema or <code>useFieldArray</code> for
        programmatic control — append, remove, move rows at runtime.
      </p>
    </div>

    <!-- FormRenderer handles the array automatically -->
    <div class="card">
      <div class="card-title">FormRenderer with type: 'array'</div>
      <p style="font-size:0.82rem;color:var(--muted);margin-bottom:16px">
        <code>FormRenderer</code> renders an <code>ArrayField</code> automatically for array fields.
        Each row renders the nested <code>fields</code> schema.
      </p>
      <FormRenderer :form="form" submit-label="Save project" />
      <div v-if="submitted" class="toast">✅ Project saved with {{ (submitted.members as unknown[]).length }} member(s)</div>
    </div>

    <!-- useFieldArray manual API -->
    <div class="card">
      <div class="card-title">useFieldArray programmatic API</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px">
        <button class="btn btn-ghost" @click="memberArray.append()">+ Append</button>
        <button class="btn btn-ghost" @click="memberArray.prepend()">Prepend</button>
        <button
          v-if="memberArray.count.value >= 2"
          class="btn btn-ghost"
          @click="memberArray.move(0, 1)"
        >
          Swap first two
        </button>
        <button
          v-if="memberArray.count.value > 0"
          class="btn btn-ghost"
          @click="memberArray.remove(memberArray.count.value - 1)"
        >
          Remove last
        </button>
      </div>
      <pre class="values-preview">count: {{ memberArray.count.value }}
members: {{ JSON.stringify(form.values.value.members, null, 2) }}</pre>
    </div>

    <div class="card">
      <div class="card-title">Live values</div>
      <pre class="values-preview">{{ JSON.stringify(form.values.value, null, 2) }}</pre>
    </div>
  </div>
</template>

<style scoped>
/* ArrayField styles — reuse FormRendererDemo styles */
:deep(.vfs-array__row) {
  background: var(--code-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px;
  margin-bottom: 12px;
}
:deep(.vfs-array__remove) {
  display: inline-flex;
  padding: 5px 12px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--error);
  border-radius: var(--radius);
  font-size: 0.8rem;
  cursor: pointer;
  margin-top: 4px;
}
:deep(.vfs-array__add) {
  display: inline-flex;
  padding: 7px 16px;
  border: 1px dashed var(--border);
  background: transparent;
  color: var(--muted);
  border-radius: var(--radius);
  font-size: 0.85rem;
  cursor: pointer;
  margin-top: 4px;
  transition: all 0.15s;
}
:deep(.vfs-array__add:hover) { color: var(--accent); border-color: var(--accent); }
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
:deep(.vfs-submit) { display: inline-flex; align-items: center; padding: 9px 20px; background: var(--accent); color: #fff; border: none; border-radius: var(--radius); font-size: 0.875rem; font-weight: 500; cursor: pointer; transition: background 0.15s; margin-top: 8px; }
:deep(.vfs-submit:hover:not(:disabled)) { background: var(--accent-h); }
:deep(.vfs-submit:disabled) { opacity: 0.45; cursor: not-allowed; }
</style>
