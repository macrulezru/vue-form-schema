<script setup lang="ts">
import { ref } from 'vue'
import { useForm, minLength, maxLength, email, min, max } from 'vue-form-schema'
import type { FieldDefinition } from 'vue-form-schema'

const schema: FieldDefinition[] = [
  {
    type: 'text',
    name: 'firstName',
    label: 'First name',
    placeholder: 'Alice',
    required: true,
    validators: [minLength(2), maxLength(40)],
  },
  {
    type: 'text',
    name: 'lastName',
    label: 'Last name',
    placeholder: 'Smith',
    required: true,
    validators: [minLength(2), maxLength(40)],
  },
  {
    type: 'email',
    name: 'email',
    label: 'Email address',
    placeholder: 'alice@example.com',
    required: true,
    validators: [email],
  },
  {
    type: 'number',
    name: 'age',
    label: 'Age',
    placeholder: '25',
    validators: [min(1), max(120)],
  },
  {
    type: 'select',
    name: 'country',
    label: 'Country',
    required: true,
    options: [
      { label: 'United States', value: 'us' },
      { label: 'United Kingdom', value: 'uk' },
      { label: 'Germany',        value: 'de' },
      { label: 'France',         value: 'fr' },
      { label: 'Russia',         value: 'ru' },
    ],
  },
  {
    type: 'textarea',
    name: 'bio',
    label: 'Short bio',
    placeholder: 'Tell us about yourself…',
    validators: [maxLength(300)],
  },
  {
    type: 'checkbox',
    name: 'terms',
    label: 'I agree to the terms of service',
    required: true,
    validators: [(v) => (v !== true ? 'You must accept the terms' : null)],
  },
]

const submitted = ref<Record<string, unknown> | null>(null)

const { values, errors, touched, isDirty, isValid, isSubmitting, submit, reset, setField } = useForm({
  schema,
  validateOn: 'blur',
  onSubmit: async (data) => {
    await new Promise((r) => setTimeout(r, 800))
    submitted.value = data
  },
})

function touch(name: string) {
  touched.value[name] = true
}

function hasError(name: string) {
  return touched.value[name] && errors.value[name]?.length
}
</script>

<template>
  <div>
    <div class="page-header">
      <h2>Basic form</h2>
      <p>
        A manually defined <code>FieldDefinition[]</code> with built-in validators:
        <code>required</code>, <code>minLength</code>, <code>maxLength</code>, <code>email</code>,
        <code>min</code>, <code>max</code>.
      </p>
    </div>

    <div class="status-bar">
      <span><span class="dot" :class="isDirty ? 'dot-yellow' : 'dot-green'" /> {{ isDirty ? 'Dirty' : 'Pristine' }}</span>
      <span><span class="dot" :class="isValid ? 'dot-green' : 'dot-red'" /> {{ isValid ? 'Valid' : 'Invalid' }}</span>
      <span><span class="dot" :class="isSubmitting ? 'dot-yellow' : 'dot-green'" /> {{ isSubmitting ? 'Submitting…' : 'Idle' }}</span>
    </div>

    <div class="card">
      <form novalidate @submit.prevent="submit">
        <div class="field-row">
          <div class="field">
            <label>First name <span class="req">*</span></label>
            <input
              :value="values.firstName"
              :class="{ 'has-error': hasError('firstName') }"
              placeholder="Alice"
              @input="setField('firstName', ($event.target as HTMLInputElement).value)"
              @blur="touch('firstName')"
            />
            <div v-if="hasError('firstName')" class="field-error">{{ errors['firstName'][0] }}</div>
          </div>
          <div class="field">
            <label>Last name <span class="req">*</span></label>
            <input
              :value="values.lastName"
              :class="{ 'has-error': hasError('lastName') }"
              placeholder="Smith"
              @input="setField('lastName', ($event.target as HTMLInputElement).value)"
              @blur="touch('lastName')"
            />
            <div v-if="hasError('lastName')" class="field-error">{{ errors['lastName'][0] }}</div>
          </div>
        </div>

        <div class="field">
          <label>Email address <span class="req">*</span></label>
          <input
            type="email"
            :value="values.email"
            :class="{ 'has-error': hasError('email') }"
            placeholder="alice@example.com"
            @input="setField('email', ($event.target as HTMLInputElement).value)"
            @blur="touch('email')"
          />
          <div v-if="hasError('email')" class="field-error">{{ errors['email'][0] }}</div>
        </div>

        <div class="field">
          <label>Age</label>
          <input
            type="number"
            :value="values.age ?? ''"
            :class="{ 'has-error': hasError('age') }"
            placeholder="25"
            @input="setField('age', Number(($event.target as HTMLInputElement).value) || null)"
            @blur="touch('age')"
          />
          <div v-if="hasError('age')" class="field-error">{{ errors['age'][0] }}</div>
        </div>

        <div class="field">
          <label>Country <span class="req">*</span></label>
          <select
            :class="{ 'has-error': hasError('country') }"
            @change="setField('country', ($event.target as HTMLSelectElement).value)"
            @blur="touch('country')"
          >
            <option value="" disabled :selected="!values.country">Select a country</option>
            <option v-for="opt in schema[4].options" :key="String(opt.value)"
              :value="opt.value" :selected="values.country === opt.value">
              {{ opt.label }}
            </option>
          </select>
          <div v-if="hasError('country')" class="field-error">{{ errors['country'][0] }}</div>
        </div>

        <div class="field">
          <label>Short bio</label>
          <textarea
            :value="values.bio ?? ''"
            :class="{ 'has-error': hasError('bio') }"
            placeholder="Tell us about yourself…"
            @input="setField('bio', ($event.target as HTMLTextAreaElement).value)"
            @blur="touch('bio')"
          />
          <div class="hint">Max 300 characters ({{ String(values.bio ?? '').length }} / 300)</div>
          <div v-if="hasError('bio')" class="field-error">{{ errors['bio'][0] }}</div>
        </div>

        <div class="field">
          <label class="checkbox-label">
            <input
              type="checkbox"
              :checked="!!values.terms"
              @change="setField('terms', ($event.target as HTMLInputElement).checked)"
              @blur="touch('terms')"
            />
            I agree to the terms of service
          </label>
          <div v-if="hasError('terms')" class="field-error">{{ errors['terms'][0] }}</div>
        </div>

        <div class="btn-row">
          <button type="submit" class="btn btn-primary" :disabled="isSubmitting">
            {{ isSubmitting ? 'Submitting…' : 'Submit' }}
          </button>
          <button type="button" class="btn btn-ghost" @click="reset()">Reset</button>
        </div>
      </form>
    </div>

    <div v-if="submitted" class="card">
      <div class="card-title">✅ Submitted values</div>
      <pre class="values-preview">{{ JSON.stringify(submitted, null, 2) }}</pre>
    </div>

    <div class="card">
      <div class="card-title">Live values</div>
      <pre class="values-preview">{{ JSON.stringify(values, null, 2) }}</pre>
    </div>
  </div>
</template>
