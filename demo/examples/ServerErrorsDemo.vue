<script setup lang="ts">
import { ref } from 'vue'
import { useForm, applyServerErrors } from 'vue-form-schema'
import { FormRenderer } from 'vue-form-schema/ui'
import type { FieldDefinition } from 'vue-form-schema'

const schema: FieldDefinition[] = [
  { type: 'text', name: 'username', label: 'Username', required: true },
  { type: 'email', name: 'email', label: 'Email', required: true },
]

const lastResponseCode = ref<string | null>(null)

// Simulates a backend that always rejects with a Laravel-style 422 —
// "username" and "email" are already taken, which no client-side validator
// could possibly know in advance.
function fakeServerCall(): { status: number; body: unknown } {
  return {
    status: 422,
    body: {
      message: 'The given data was invalid.',
      errors: {
        username: ['The username has already been taken.'],
        email: ['The email has already been taken.'],
      },
    },
  }
}

const form = useForm({
  schema,
  validateOn: 'blur',
  onSubmit: async () => {
    await new Promise((r) => setTimeout(r, 300))
    const response = fakeServerCall()
    lastResponseCode.value = String(response.status)
    applyServerErrors(form, response.body, { format: 'laravel' })
  },
})
</script>

<template>
  <div>
    <div class="page-header">
      <h2>Server-side validation errors</h2>
      <p>
        <code>applyServerErrors()</code> maps a backend's validation error response onto
        <code>form.errors</code> — this demo always "fails" with a Laravel-style 422 response so you
        can see it in action. Submit the form (any values) to trigger it.
      </p>
    </div>

    <div class="card">
      <div class="card-title">Usage</div>
      <pre class="code-block">
const { formErrors } = applyServerErrors(form, await res.json(), { format: 'laravel' })
// fieldErrors are applied to form.errors automatically and the fields are touched
// formErrors (not tied to a field) are returned for you to display yourself</pre>
    </div>

    <div class="card">
      <FormRenderer :form="form" submit-label="Create account" />
      <div v-if="lastResponseCode" class="toast" style="background: var(--error)">
        Server responded {{ lastResponseCode }} — errors applied to the fields above. Edit either
        field to see its server error naturally clear on the next client-side revalidation.
      </div>
    </div>
  </div>
</template>
