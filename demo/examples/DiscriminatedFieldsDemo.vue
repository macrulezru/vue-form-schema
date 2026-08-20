<script setup lang="ts">
import { useForm, discriminatedFields } from 'vue-form-schema'
import { FormRenderer } from 'vue-form-schema/ui'
import { parseZod } from 'vue-form-schema/zod'
import type { FieldDefinition } from 'vue-form-schema'
import { z } from 'zod'

// ── discriminatedFields() — hand-wired schema ──────────────────────────────────
const paymentSchema: FieldDefinition[] = [
  {
    type: 'radio',
    name: 'paymentMethod',
    label: 'Payment method',
    required: true,
    defaultValue: 'card',
    options: [
      { label: 'Card', value: 'card' },
      { label: 'PayPal', value: 'paypal' },
    ],
  },
  ...discriminatedFields('paymentMethod', {
    card: [
      {
        type: 'text',
        name: 'cardNumber',
        label: 'Card number',
        required: true,
        defaultValue: '',
        placeholder: '4242 4242 4242 4242',
      },
      { type: 'text', name: 'cvc', label: 'CVC', required: true, defaultValue: '' },
    ],
    paypal: [
      {
        type: 'email',
        name: 'paypalEmail',
        label: 'PayPal email',
        required: true,
        defaultValue: '',
      },
    ],
  }),
]

const paymentForm = useForm({ schema: paymentSchema, validateOn: 'blur', clearOnHide: true })

// ── Native z.discriminatedUnion() mapping ──────────────────────────────────────
const addressSchema = z.discriminatedUnion('addressType', [
  z.object({
    addressType: z.literal('residential'),
    street: z.string().min(1).describe('Street'),
    apartment: z.string().optional().describe('Apartment / unit'),
  }),
  z.object({
    addressType: z.literal('pobox'),
    poBoxNumber: z.string().min(1).describe('PO box number'),
  }),
])

const addressForm = useForm({
  schema: parseZod(addressSchema),
  validateOn: 'blur',
  clearOnHide: true,
})
</script>

<template>
  <div>
    <div class="page-header">
      <h2>Discriminated schemas</h2>
      <p>
        <code>discriminatedFields(discriminatorName, variants)</code> switches a whole set of
        fields based on one selector field's value, instead of hand-wiring <code>visible</code>
        on every field. Combine with <code>clearOnHide: true</code> so switching variants resets
        the hidden variant's values.
      </p>
    </div>

    <!-- discriminatedFields() -->
    <div class="card">
      <div class="card-title">discriminatedFields() — payment method</div>
      <p style="font-size: 0.82rem; color: var(--muted); margin-bottom: 16px">
        Switch "Payment method" — the card fields and the PayPal field never share the form at
        the same time, and switching clears the other variant's values.
      </p>
      <FormRenderer :form="paymentForm" submit-label="Pay" />
      <div class="card-title" style="margin-top: 16px">Values</div>
      <pre class="values-preview">{{ JSON.stringify(paymentForm.values.value, null, 2) }}</pre>
    </div>

    <!-- Native z.discriminatedUnion() -->
    <div class="card">
      <div class="card-title">Native z.discriminatedUnion() mapping</div>
      <p style="font-size: 0.82rem; color: var(--muted); margin-bottom: 16px">
        <code>parseZod</code> accepts a root <code>z.discriminatedUnion(key, [...])</code> schema
        directly — no manual <code>discriminatedFields</code> call needed, the discriminator
        <code>select</code> and every variant's fields are generated for you.
      </p>
      <FormRenderer :form="addressForm" submit-label="Save address" />
      <div class="card-title" style="margin-top: 16px">Values</div>
      <pre class="values-preview">{{ JSON.stringify(addressForm.values.value, null, 2) }}</pre>
    </div>
  </div>
</template>

<style scoped>
:deep(.vfs-field) {
  margin-bottom: 16px;
}
:deep(.vfs-field__label) {
  display: block;
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 6px;
}
:deep(.vfs-field__required) {
  color: var(--error);
  margin-left: 2px;
}
:deep(.vfs-field__errors) {
  list-style: none;
}
:deep(.vfs-field__error) {
  font-size: 0.78rem;
  color: var(--error);
  margin-top: 4px;
}
:deep(.vfs-input),
:deep(.vfs-textarea),
:deep(.vfs-select) {
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
:deep(.vfs-input:focus),
:deep(.vfs-textarea:focus),
:deep(.vfs-select:focus) {
  border-color: var(--accent);
}
:deep(.vfs-submit) {
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
:deep(.vfs-submit:hover:not(:disabled)) {
  background: var(--accent-h);
}
:deep(.vfs-submit:disabled) {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>
