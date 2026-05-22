<script setup lang="ts">
import { ref } from 'vue'
import { useForm, fileType, fileSize, fileCount } from 'vue-form-schema'
import { FormRenderer } from 'vue-form-schema/ui'
import type { FieldDefinition } from 'vue-form-schema'

// ── Single file upload ────────────────────────────────────────────────────────
const avatarSchema: FieldDefinition[] = [
  { type: 'text', name: 'name', label: 'Display name', required: true, placeholder: 'Alice' },
  {
    type: 'file',
    name: 'avatar',
    label: 'Profile photo',
    accept: 'image/*',
    validators: [
      fileType(['image/'], 'Only image files are accepted'),
      fileSize(2 * 1024 * 1024, 'File must be smaller than 2 MB'),
    ],
  },
]

const avatarSubmitted = ref<{ name: string } | null>(null)
const avatarForm = useForm({
  schema: avatarSchema,
  validateOn: 'blur',
  onSubmit: async (data) => {
    await new Promise((r) => setTimeout(r, 500))
    avatarSubmitted.value = { name: data.name as string }
  },
})

// ── Multiple file upload ──────────────────────────────────────────────────────
const attachmentsSchema: FieldDefinition[] = [
  { type: 'text', name: 'subject', label: 'Subject', required: true, placeholder: 'Project files' },
  {
    type: 'file',
    name: 'attachments',
    label: 'Attachments',
    multiple: true,
    accept: '.pdf,.docx,.xlsx,.png,.jpg',
    validators: [
      fileCount(5, 'Maximum 5 files allowed'),
      fileSize(10 * 1024 * 1024, 'Each file must be under 10 MB'),
    ],
  },
]

const attachmentsSubmitted = ref<{ subject: string; count: number } | null>(null)
const attachmentsForm = useForm({
  schema: attachmentsSchema,
  validateOn: 'blur',
  onSubmit: async (data) => {
    const files = Array.isArray(data.attachments) ? data.attachments : (data.attachments ? [data.attachments] : [])
    attachmentsSubmitted.value = { subject: data.subject as string, count: files.length }
  },
})
</script>

<template>
  <div>
    <div class="page-header">
      <h2>File upload field</h2>
      <p>
        <code>type: 'file'</code> with built-in validators: <code>fileType</code>,
        <code>fileSize</code>, <code>fileCount</code>. Supports single and multiple files
        with drag-and-drop.
      </p>
    </div>

    <!-- Single file -->
    <div class="card">
      <div class="card-title">Single file — image only, max 2 MB</div>
      <pre class="code-block" style="margin-bottom:16px">{ type: 'file', accept: 'image/*',
  validators: [fileType(['image/']), fileSize(2 * 1024 * 1024)] }</pre>
      <FormRenderer :form="avatarForm" submit-label="Update profile" />
      <div v-if="avatarSubmitted" class="toast">
        ✅ Profile updated for {{ avatarSubmitted.name }}
      </div>
    </div>

    <!-- Multiple files -->
    <div class="card">
      <div class="card-title">Multiple files — up to 5, max 10 MB each</div>
      <pre class="code-block" style="margin-bottom:16px">{ type: 'file', multiple: true, accept: '.pdf,.docx,.xlsx',
  validators: [fileCount(5), fileSize(10 * 1024 * 1024)] }</pre>
      <FormRenderer :form="attachmentsForm" submit-label="Upload files" />
      <div v-if="attachmentsSubmitted" class="toast">
        ✅ "{{ attachmentsSubmitted.subject }}" — {{ attachmentsSubmitted.count }} file(s) uploaded
      </div>
    </div>
  </div>
</template>

<style scoped>
:deep(.vfs-field) { margin-bottom: 16px; }
:deep(.vfs-field__label) { display: block; font-size: 0.8rem; font-weight: 500; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 6px; }
:deep(.vfs-field__required) { color: var(--error); margin-left: 2px; }
:deep(.vfs-field__errors) { list-style: none; }
:deep(.vfs-field__error) { font-size: 0.78rem; color: var(--error); margin-top: 4px; }
:deep(.vfs-input) {
  width: 100%; padding: 9px 12px; background: var(--code-bg);
  border: 1px solid var(--border); border-radius: var(--radius);
  color: var(--text); font-family: var(--font); font-size: 0.9rem; outline: none; transition: border-color 0.15s;
}
:deep(.vfs-input:focus) { border-color: var(--accent); }
:deep(.vfs-file-zone) {
  border: 2px dashed var(--border); border-radius: var(--radius);
  padding: 24px; text-align: center; cursor: pointer; transition: all 0.15s; position: relative;
}
:deep(.vfs-file-zone:hover) { border-color: var(--accent); }
:deep(.vfs-file-zone--dragging) { border-color: var(--accent); background: rgba(109,106,254,0.06); }
:deep(.vfs-file-input) { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%; }
:deep(.vfs-file-label) { display: flex; flex-direction: column; align-items: center; gap: 6px; pointer-events: none; }
:deep(.vfs-file-icon) { font-size: 1.8rem; }
:deep(.vfs-file-label span) { font-size: 0.85rem; color: var(--muted); }
:deep(.vfs-file-hint) { font-size: 0.75rem; color: var(--border); }
:deep(.vfs-file-list) { list-style: none; margin-top: 8px; display: flex; flex-direction: column; gap: 6px; }
:deep(.vfs-file-item) { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: var(--code-bg); border: 1px solid var(--border); border-radius: var(--radius); font-size: 0.82rem; }
:deep(.vfs-file-name) { flex: 1; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
:deep(.vfs-file-size) { color: var(--muted); flex-shrink: 0; }
:deep(.vfs-file-remove) { flex-shrink: 0; background: none; border: none; color: var(--muted); cursor: pointer; font-size: 1rem; line-height: 1; padding: 0 2px; }
:deep(.vfs-file-remove:hover) { color: var(--error); }
:deep(.vfs-submit) { display: inline-flex; align-items: center; padding: 9px 20px; background: var(--accent); color: #fff; border: none; border-radius: var(--radius); font-size: 0.875rem; font-weight: 500; cursor: pointer; margin-top: 8px; }
:deep(.vfs-submit:hover:not(:disabled)) { background: var(--accent-h); }
:deep(.vfs-submit:disabled) { opacity: 0.45; cursor: not-allowed; }
</style>
