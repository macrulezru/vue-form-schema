<script setup lang="ts">
import { ref } from 'vue'
import { z } from 'zod'
import { parseZod } from 'vue-form-schema/zod'
import { useForm } from 'vue-form-schema'

const schema = z.object({
  username:   z.string().min(3, 'At least 3 characters').max(20).describe('Username'),
  email:      z.string().email('Invalid email address').describe('Email'),
  website:    z.string().url('Must be a valid URL').optional().describe('Website'),
  role:       z.enum(['admin', 'editor', 'viewer']).describe('Role'),
  newsletter: z.boolean().optional().describe('Subscribe to newsletter'),
})

type FormData = z.infer<typeof schema>

const schemaCode = `const schema = z.object({
  username:   z.string().min(3).max(20).describe('Username'),
  email:      z.string().email().describe('Email'),
  website:    z.string().url().optional().describe('Website'),
  role:       z.enum(['admin', 'editor', 'viewer']).describe('Role'),
  newsletter: z.boolean().optional().describe('Subscribe to newsletter'),
})`

const fields = parseZod(schema)
const submitted = ref<FormData | null>(null)

const { values, errors, touched, isValid, isSubmitting, submit, reset, setField } = useForm<FormData>({
  schema: fields,
  validateOn: 'blur',
  onSubmit: async (data) => {
    await new Promise((r) => setTimeout(r, 600))
    submitted.value = data
  },
})

function touch(name: string) { touched.value[name] = true }
function hasError(name: string) { return touched.value[name] && errors.value[name]?.length }

const roleOptions = [
  { label: 'Admin',  value: 'admin'  },
  { label: 'Editor', value: 'editor' },
  { label: 'Viewer', value: 'viewer' },
]
</script>

<template>
  <div>
    <div class="page-header">
      <h2>Zod schema <span class="badge badge-zod">Zod</span></h2>
      <p>
        Define your schema with Zod and pass it through <code>parseZod()</code>.
        All Zod constraints are converted to validator functions; <code>.describe()</code>
        sets the field label.
      </p>
    </div>

    <div class="card">
      <div class="card-title">Schema</div>
      <pre class="code-block">{{ schemaCode }}</pre>
    </div>

    <div class="card">
      <form novalidate @submit.prevent="submit">
        <div class="field">
          <label>Username <span class="req">*</span></label>
          <input
            :value="values.username"
            :class="{ 'has-error': hasError('username') }"
            placeholder="alice_dev"
            @input="setField('username', ($event.target as HTMLInputElement).value)"
            @blur="touch('username')"
          />
          <div v-if="hasError('username')" class="field-error">{{ errors['username'][0] }}</div>
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
          <label>Website <span style="color:var(--muted)">(optional)</span></label>
          <input
            :value="values.website ?? ''"
            :class="{ 'has-error': hasError('website') }"
            placeholder="https://alice.dev"
            @input="setField('website', ($event.target as HTMLInputElement).value || undefined)"
            @blur="touch('website')"
          />
          <div v-if="hasError('website')" class="field-error">{{ errors['website'][0] }}</div>
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
              :checked="!!values.newsletter"
              @change="setField('newsletter', ($event.target as HTMLInputElement).checked)"
            />
            Subscribe to newsletter
          </label>
        </div>

        <div class="btn-row">
          <button type="submit" class="btn btn-primary" :disabled="isSubmitting">
            {{ isSubmitting ? 'Creating…' : 'Create account' }}
          </button>
          <button type="button" class="btn btn-ghost" @click="reset()">Reset</button>
        </div>
      </form>
    </div>

    <div v-if="submitted" class="card">
      <div class="card-title">✅ Submitted values (typed as <code>z.infer&lt;typeof schema&gt;</code>)</div>
      <pre class="values-preview">{{ JSON.stringify(submitted, null, 2) }}</pre>
    </div>

    <div class="card">
      <div class="card-title">Parsed fields from Zod</div>
      <pre class="values-preview">{{ JSON.stringify(fields.map(f => ({ name: f.name, type: f.type, label: f.label, required: f.required })), null, 2) }}</pre>
    </div>
  </div>
</template>
