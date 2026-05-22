<script setup lang="ts">
import { ref } from 'vue'
import { useForm } from 'vue-form-schema'
import { FormRenderer } from 'vue-form-schema/ui'
import type { FieldDefinition } from 'vue-form-schema'

// ── Demo 1: simple FormRenderer ────────────────────────────────────────────
const contactSchema: FieldDefinition[] = [
  { type: 'text',     name: 'name',    label: 'Full name',    required: true },
  { type: 'email',    name: 'email',   label: 'Email',        required: true },
  { type: 'select',   name: 'subject', label: 'Subject',      required: true,
    options: [
      { label: 'General inquiry', value: 'general' },
      { label: 'Support',         value: 'support' },
      { label: 'Partnership',     value: 'partner' },
    ],
  },
  { type: 'textarea', name: 'message', label: 'Message',      required: true },
  { type: 'checkbox', name: 'copy',    label: 'Send me a copy' },
]

const submitted1 = ref<Record<string, unknown> | null>(null)

const contactForm = useForm({
  schema: contactSchema,
  validateOn: 'blur',
  onSubmit: async (data) => {
    await new Promise((r) => setTimeout(r, 700))
    submitted1.value = data
  },
})

// ── Demo 2: slot override ──────────────────────────────────────────────────
const ratingSchema: FieldDefinition[] = [
  { type: 'text',  name: 'product', label: 'Product name', required: true },
  { type: 'number', name: 'rating', label: 'Rating (1-5)', required: true },
  { type: 'textarea', name: 'comment', label: 'Comment' },
]

const submitted2 = ref<Record<string, unknown> | null>(null)

const ratingForm = useForm({
  schema: ratingSchema,
  validateOn: 'blur',
  onSubmit: async (data) => {
    await new Promise((r) => setTimeout(r, 500))
    submitted2.value = data
  },
})

const stars = [1, 2, 3, 4, 5]
</script>

<template>
  <div>
    <div class="page-header">
      <h2>FormRenderer</h2>
      <p>
        <code>FormRenderer</code> from <code>vue-form-schema/ui</code> renders fields automatically.
        Use slots to override individual fields, labels, errors, and the submit button.
      </p>
    </div>

    <!-- Demo 1: out-of-the-box rendering -->
    <div class="card">
      <div class="card-title">Out-of-the-box rendering</div>
      <p style="font-size:0.82rem;color:var(--muted);margin-bottom:16px">
        Just pass <code>:form="form"</code> — no additional markup needed.
      </p>
      <pre class="code-block" style="margin-bottom:16px">&lt;FormRenderer :form="contactForm" submit-label="Send message" /&gt;</pre>

      <FormRenderer :form="contactForm" submit-label="Send message" />

      <div v-if="submitted1" class="toast">
        ✅ Message sent! — {{ submitted1.name }} &lt;{{ submitted1.email }}&gt;
      </div>
    </div>

    <!-- Demo 2: slot override -->
    <div class="card">
      <div class="card-title">Slot overrides — custom rating field</div>
      <p style="font-size:0.82rem;color:var(--muted);margin-bottom:16px">
        Use <code>#field-{name}</code> to replace a field entirely.
        Use <code>#submit</code> to customise the submit button.
      </p>
      <pre class="code-block" style="margin-bottom:16px">&lt;FormRenderer :form="ratingForm"&gt;
  &lt;template #field-rating="{ value, setValue }"&gt;
    &lt;!-- star picker replaces the number input --&gt;
  &lt;/template&gt;
  &lt;template #submit="{ isSubmitting, isValid }"&gt;
    &lt;!-- custom submit area --&gt;
  &lt;/template&gt;
&lt;/FormRenderer&gt;</pre>

      <FormRenderer :form="ratingForm">
        <!-- Custom star-rating widget replaces the number field -->
        <template #field-rating="{ value, setValue }">
          <div class="field">
            <label style="font-size:0.8rem;font-weight:500;color:var(--muted);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:8px;display:block">
              Rating <span style="color:var(--error)">*</span>
            </label>
            <div style="display:flex;gap:6px">
              <button
                v-for="star in stars"
                :key="star"
                type="button"
                style="font-size:1.6rem;background:none;border:none;cursor:pointer;line-height:1;padding:2px;transition:transform 0.1s"
                :style="{ transform: Number(value) >= star ? 'scale(1.15)' : 'scale(1)' }"
                @click="setValue(star)"
              >
                {{ Number(value) >= star ? '★' : '☆' }}
              </button>
            </div>
            <div v-if="ratingForm.touched.value['rating'] && ratingForm.errors.value['rating']?.length"
              class="field-error" style="margin-top:4px">
              {{ ratingForm.errors.value['rating'][0] }}
            </div>
          </div>
        </template>

        <!-- Custom submit row -->
        <template #submit="{ isSubmitting, isValid }">
          <div class="btn-row">
            <button type="submit" class="btn btn-primary" :disabled="isSubmitting || !isValid">
              {{ isSubmitting ? 'Submitting review…' : '⭐ Submit review' }}
            </button>
            <button type="button" class="btn btn-ghost" @click="ratingForm.reset()">
              Clear
            </button>
            <span style="font-size:0.78rem;color:var(--muted);margin-left:auto">
              {{ isValid ? '✓ Ready to submit' : 'Fill in required fields' }}
            </span>
          </div>
        </template>
      </FormRenderer>

      <div v-if="submitted2" class="toast">
        ✅ Review submitted! Rating: {{ submitted2.rating }}/5
      </div>
    </div>

    <!-- Components map reference -->
    <div class="card">
      <div class="card-title">Using a custom component map</div>
      <pre class="code-block">import { ElInput, ElSelect } from 'element-plus'

// Override per-type renderers — your components receive the same props
const myComponents = {
  text:     ElInput,
  select:   ElSelect,
}

&lt;FormRenderer :form="form" :components="myComponents" /&gt;</pre>
    </div>
  </div>
</template>

<style>
/* vfs built-in component styles (scoped to demo) */
.vfs-field { margin-bottom: 16px; }
.vfs-field__label {
  display: block;
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 6px;
}
.vfs-field__required { color: var(--error); margin-left: 2px; }
.vfs-field__errors { list-style: none; }
.vfs-field__error { font-size: 0.78rem; color: var(--error); margin-top: 4px; }
.vfs-input,
.vfs-textarea,
.vfs-select {
  width: 100%;
  padding: 9px 12px;
  background: var(--code-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text);
  font-family: var(--font);
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.15s;
}
.vfs-input:focus, .vfs-textarea:focus, .vfs-select:focus { border-color: var(--accent); }
.vfs-textarea { resize: vertical; min-height: 80px; }
.vfs-field--error .vfs-input,
.vfs-field--error .vfs-textarea,
.vfs-field--error .vfs-select { border-color: var(--error); }
.vfs-checkbox-label {
  display: flex !important;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 400;
  color: var(--text);
  text-transform: none;
  letter-spacing: normal;
  margin-bottom: 0;
}
.vfs-radio-group { display: flex; flex-direction: column; gap: 10px; }
.vfs-radio-label {
  display: flex !important;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 400;
  color: var(--text);
}
.vfs-radio, .vfs-checkbox {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  cursor: pointer;
  accent-color: var(--accent);
}
.vfs-submit {
  display: inline-flex;
  align-items: center;
  padding: 9px 20px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: var(--radius);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
  margin-top: 8px;
}
.vfs-submit:hover:not(:disabled) { background: var(--accent-h); }
.vfs-submit:disabled { opacity: 0.45; cursor: not-allowed; }
</style>
