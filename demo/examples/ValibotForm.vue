<script setup lang="ts">
import { ref } from 'vue'
import * as v from 'valibot'
import { parseValibot } from 'vue-form-schema/valibot'
import { useForm } from 'vue-form-schema'

const schema = v.object({
  fullName: v.pipe(v.string(), v.minLength(2, 'At least 2 characters')),
  email:    v.pipe(v.string(), v.email('Invalid email address')),
  age:      v.optional(v.pipe(v.number(), v.minValue(18, 'Must be 18 or older'))),
  role:     v.picklist(['developer', 'designer', 'manager']),
  agree:    v.literal(true),
})

const schemaCode = `import * as v from 'valibot'
import { parseValibot } from '@macrulez/vue-form-schema/valibot'

const schema = v.object({
  fullName: v.pipe(v.string(), v.minLength(2)),
  email:    v.pipe(v.string(), v.email()),
  age:      v.optional(v.pipe(v.number(), v.minValue(18))),
  role:     v.picklist(['developer', 'designer', 'manager']),
  agree:    v.literal(true),
})

// parseValibot returns FieldDefinition[] — add labels manually
// (Valibot has no .describe() equivalent)
const rawFields = parseValibot(schema)
const fields = rawFields.map(f => ({ ...f, label: labels[f.name] }))`

const rawFields = parseValibot(schema)

const labels: Record<string, string> = {
  fullName: 'Full name',
  email:    'Email',
  age:      'Age (18+)',
  role:     'Role',
  agree:    'I agree to the terms of service',
}

const roleOptions = [
  { label: 'Developer', value: 'developer' },
  { label: 'Designer',  value: 'designer'  },
  { label: 'Manager',   value: 'manager'   },
]

const fields = rawFields.map(f => ({
  ...f,
  label: labels[f.name],
  ...(f.name === 'role' ? { options: roleOptions } : {}),
}))

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
      <h2>Valibot schema <span class="badge badge-valibot">Valibot</span></h2>
      <p>
        Define your schema with Valibot and pass it through <code>parseValibot()</code>.
        Unlike Zod, Valibot has no <code>.describe()</code> — labels are added manually
        after parsing.
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
            :value="values.fullName ?? ''"
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
            :value="values.email ?? ''"
            :class="{ 'has-error': hasError('email') }"
            placeholder="alice@example.com"
            @input="setField('email', ($event.target as HTMLInputElement).value)"
            @blur="touch('email')"
          />
          <div v-if="hasError('email')" class="field-error">{{ errors['email'][0] }}</div>
        </div>

        <div class="field">
          <label>Age (18+) <span style="color:var(--muted)">(optional)</span></label>
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
          <label>Role <span class="req">*</span></label>
          <select
            :class="{ 'has-error': hasError('role') }"
            @change="setField('role', ($event.target as HTMLSelectElement).value)"
            @blur="touch('role')"
          >
            <option value="" disabled :selected="!values.role">Select a role</option>
            <option v-for="opt in roleOptions" :key="opt.value"
              :value="opt.value" :selected="values.role === opt.value">
              {{ opt.label }}
            </option>
          </select>
          <div v-if="hasError('role')" class="field-error">{{ errors['role'][0] }}</div>
        </div>

        <div class="field">
          <label class="checkbox-label">
            <input
              type="checkbox"
              :checked="!!values.agree"
              @change="setField('agree', ($event.target as HTMLInputElement).checked || undefined)"
              @blur="touch('agree')"
            />
            I agree to the terms of service <span class="req">*</span>
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

    <div class="card">
      <div class="card-title">Parsed fields from Valibot</div>
      <pre class="values-preview">{{ JSON.stringify(fields.map(f => ({ name: f.name, type: f.type, label: f.label, required: f.required })), null, 2) }}</pre>
    </div>
  </div>
</template>
