<script setup lang="ts">
import { ref } from 'vue'
import * as yup from 'yup'
import { parseYup } from 'vue-form-schema/yup'
import { useForm } from 'vue-form-schema'

const schema = yup.object({
  fullName:  yup.string().min(2, 'At least 2 characters').required().label('Full name'),
  email:     yup.string().email('Invalid email').required().label('Email'),
  age:       yup.number().min(18, 'Must be 18 or older').max(120).optional().label('Age'),
  bio:       yup.string().max(200, 'Max 200 characters').optional().label('Bio'),
  agree:     yup.boolean().oneOf([true], 'You must agree').required().label('Agreement'),
})

const schemaCode = `const schema = yup.object({
  fullName: yup.string().min(2).required().label('Full name'),
  email:    yup.string().email().required().label('Email'),
  age:      yup.number().min(18).max(120).optional().label('Age'),
  bio:      yup.string().max(200).optional().label('Bio'),
  agree:    yup.boolean().oneOf([true]).required().label('Agreement'),
})`

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fields = parseYup(schema as any)
const submitted = ref<Record<string, unknown> | null>(null)

const { values, errors, touched, isSubmitting, submit, reset, setField } = useForm({
  schema: fields,
  validateOn: 'blur',
  onSubmit: async (data) => {
    await new Promise((r) => setTimeout(r, 600))
    submitted.value = data
  },
})

function touch(name: string) { touched.value[name] = true }
function hasError(name: string) { return touched.value[name] && errors.value[name]?.length }
</script>

<template>
  <div>
    <div class="page-header">
      <h2>Yup schema <span class="badge badge-yup">Yup</span></h2>
      <p>
        Define your schema with Yup and pass it through <code>parseYup()</code>.
        Yup's built-in validations are delegated to <code>validateSync()</code>
        so all constraints are honoured automatically.
      </p>
    </div>

    <div class="card">
      <div class="card-title">Schema</div>
      <pre class="code-block">{{ schemaCode }}</pre>
    </div>

    <div class="card">
      <form novalidate @submit.prevent="submit">
        <div class="field">
          <label>Full name <span class="req">*</span></label>
          <input
            :value="values.fullName"
            :class="{ 'has-error': hasError('fullName') }"
            placeholder="Alice Smith"
            @input="setField('fullName', ($event.target as HTMLInputElement).value)"
            @blur="touch('fullName')"
          />
          <div v-if="hasError('fullName')" class="field-error">{{ errors['fullName'][0] }}</div>
        </div>

        <div class="field">
          <label>Email <span class="req">*</span></label>
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
          <label>Age <span style="color:var(--muted)">(18+)</span></label>
          <input
            type="number"
            :value="values.age ?? ''"
            :class="{ 'has-error': hasError('age') }"
            placeholder="25"
            @input="setField('age', Number(($event.target as HTMLInputElement).value) || undefined)"
            @blur="touch('age')"
          />
          <div v-if="hasError('age')" class="field-error">{{ errors['age'][0] }}</div>
        </div>

        <div class="field">
          <label>Bio <span style="color:var(--muted)">(optional)</span></label>
          <textarea
            :value="values.bio ?? ''"
            placeholder="A few words about you…"
            @input="setField('bio', ($event.target as HTMLTextAreaElement).value)"
            @blur="touch('bio')"
          />
          <div class="hint">{{ String(values.bio ?? '').length }} / 200</div>
        </div>

        <div class="field">
          <label class="checkbox-label">
            <input
              type="checkbox"
              :checked="!!values.agree"
              @change="setField('agree', ($event.target as HTMLInputElement).checked)"
              @blur="touch('agree')"
            />
            I agree to the terms of service
          </label>
          <div v-if="hasError('agree')" class="field-error">{{ errors['agree'][0] }}</div>
        </div>

        <div class="btn-row">
          <button type="submit" class="btn btn-primary" :disabled="isSubmitting">
            {{ isSubmitting ? 'Registering…' : 'Register' }}
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
