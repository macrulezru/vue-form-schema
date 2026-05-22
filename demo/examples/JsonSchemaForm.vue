<script setup lang="ts">
import { ref } from 'vue'
import { useForm, parseJSON } from 'vue-form-schema'
import type { JSONSchema } from 'vue-form-schema'

// Simulates a schema arriving from an API as plain JSON
const rawSchema: JSONSchema = [
  {
    type: 'text',
    name: 'productName',
    label: 'Product name',
    placeholder: 'Super Widget 3000',
    required: true,
    validators: [
      { rule: 'minLength', value: 3, message: 'Name must be at least 3 characters' },
      { rule: 'maxLength', value: 80 },
    ],
  },
  {
    type: 'select',
    name: 'category',
    label: 'Category',
    required: true,
    options: [
      { label: 'Electronics', value: 'electronics' },
      { label: 'Clothing',    value: 'clothing' },
      { label: 'Books',       value: 'books' },
      { label: 'Home',        value: 'home' },
    ],
  },
  {
    type: 'number',
    name: 'price',
    label: 'Price (USD)',
    placeholder: '9.99',
    required: true,
    validators: [
      { rule: 'min', value: 0.01, message: 'Price must be greater than 0' },
      { rule: 'max', value: 99999 },
    ],
  },
  {
    type: 'number',
    name: 'stock',
    label: 'Stock quantity',
    default: 0,
    validators: [{ rule: 'min', value: 0, message: 'Stock cannot be negative' }],
  },
  {
    type: 'text',
    name: 'sku',
    label: 'SKU',
    placeholder: 'WIDGET-001',
    validators: [
      { rule: 'pattern', value: '^[A-Z0-9\\-]+$', message: 'Only uppercase letters, digits and hyphens' },
    ],
  },
  {
    type: 'textarea',
    name: 'description',
    label: 'Description',
    placeholder: 'Describe your product…',
    validators: [{ rule: 'maxLength', value: 500 }],
  },
  {
    type: 'checkbox',
    name: 'published',
    label: 'Publish immediately',
    default: false,
  },
]

const schemaCode = JSON.stringify(rawSchema.slice(0, 2), null, 2) + '\n  // … more fields'

const fields = parseJSON(rawSchema)
const submitted = ref<Record<string, unknown> | null>(null)

const { values, errors, touched, isValid, isSubmitting, submit, reset, setField } = useForm({
  schema: fields,
  validateOn: 'blur',
  onSubmit: async (data) => {
    await new Promise((r) => setTimeout(r, 600))
    submitted.value = data
  },
})

function touch(name: string) { touched.value[name] = true }
function hasError(name: string) { return touched.value[name] && errors.value[name]?.length }
function getOption(fieldName: string) {
  return fields.find((f) => f.name === fieldName)?.options ?? []
}
</script>

<template>
  <div>
    <div class="page-header">
      <h2>JSON schema <span class="badge badge-json">JSON</span></h2>
      <p>
        Schema defined as a plain serialisable array — suitable for server-driven forms.
        Validators are expressed as named rules (<code>minLength</code>, <code>pattern</code>, …)
        and converted to functions by <code>parseJSON()</code>.
      </p>
    </div>

    <div class="card">
      <div class="card-title">Schema (abbreviated)</div>
      <pre class="code-block">{{ schemaCode }}</pre>
    </div>

    <div class="card">
      <form novalidate @submit.prevent="submit">
        <div class="field">
          <label>Product name <span class="req">*</span></label>
          <input
            :value="values.productName"
            :class="{ 'has-error': hasError('productName') }"
            placeholder="Super Widget 3000"
            @input="setField('productName', ($event.target as HTMLInputElement).value)"
            @blur="touch('productName')"
          />
          <div v-if="hasError('productName')" class="field-error">{{ errors['productName'][0] }}</div>
        </div>

        <div class="field-row">
          <div class="field">
            <label>Category <span class="req">*</span></label>
            <select
              :class="{ 'has-error': hasError('category') }"
              @change="setField('category', ($event.target as HTMLSelectElement).value)"
              @blur="touch('category')"
            >
              <option value="" disabled :selected="!values.category">Pick a category</option>
              <option v-for="opt in getOption('category')" :key="String(opt.value)"
                :value="opt.value" :selected="values.category === opt.value">
                {{ opt.label }}
              </option>
            </select>
            <div v-if="hasError('category')" class="field-error">{{ errors['category'][0] }}</div>
          </div>

          <div class="field">
            <label>SKU</label>
            <input
              :value="values.sku"
              :class="{ 'has-error': hasError('sku') }"
              placeholder="WIDGET-001"
              style="text-transform: uppercase"
              @input="setField('sku', ($event.target as HTMLInputElement).value.toUpperCase())"
              @blur="touch('sku')"
            />
            <div v-if="hasError('sku')" class="field-error">{{ errors['sku'][0] }}</div>
          </div>
        </div>

        <div class="field-row">
          <div class="field">
            <label>Price (USD) <span class="req">*</span></label>
            <input
              type="number"
              :value="values.price ?? ''"
              :class="{ 'has-error': hasError('price') }"
              placeholder="9.99"
              step="0.01"
              @input="setField('price', parseFloat(($event.target as HTMLInputElement).value) || null)"
              @blur="touch('price')"
            />
            <div v-if="hasError('price')" class="field-error">{{ errors['price'][0] }}</div>
          </div>

          <div class="field">
            <label>Stock quantity</label>
            <input
              type="number"
              :value="values.stock ?? 0"
              :class="{ 'has-error': hasError('stock') }"
              @input="setField('stock', parseInt(($event.target as HTMLInputElement).value) || 0)"
              @blur="touch('stock')"
            />
            <div v-if="hasError('stock')" class="field-error">{{ errors['stock'][0] }}</div>
          </div>
        </div>

        <div class="field">
          <label>Description</label>
          <textarea
            :value="values.description ?? ''"
            placeholder="Describe your product…"
            @input="setField('description', ($event.target as HTMLTextAreaElement).value)"
            @blur="touch('description')"
          />
          <div class="hint">{{ String(values.description ?? '').length }} / 500</div>
        </div>

        <div class="field">
          <label class="checkbox-label">
            <input
              type="checkbox"
              :checked="!!values.published"
              @change="setField('published', ($event.target as HTMLInputElement).checked)"
            />
            Publish immediately
          </label>
        </div>

        <div class="btn-row">
          <button type="submit" class="btn btn-primary" :disabled="isSubmitting || !isValid">
            {{ isSubmitting ? 'Saving…' : 'Save product' }}
          </button>
          <button type="button" class="btn btn-ghost" @click="reset()">Reset</button>
        </div>
      </form>
    </div>

    <div v-if="submitted" class="card">
      <div class="card-title">✅ Submitted values</div>
      <pre class="values-preview">{{ JSON.stringify(submitted, null, 2) }}</pre>
    </div>
  </div>
</template>
