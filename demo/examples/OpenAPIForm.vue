<script setup lang="ts">
import { ref } from 'vue'
import { useForm } from 'vue-form-schema'
import { FormRenderer } from 'vue-form-schema/ui'
import { parseOpenAPI, parseJSONSchema } from 'vue-form-schema/openapi'
import type { JSONSchemaDocument } from 'vue-form-schema/openapi'

// A trimmed OpenAPI document — the kind your backend already generates via
// Swagger/NestJS/FastAPI/etc. `role` is a $ref into components.schemas,
// resolved automatically against the full document.
const openapiDocument: JSONSchemaDocument = {
  openapi: '3.0.0',
  paths: {
    '/users': {
      post: {
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', title: 'Full name', minLength: 2, maxLength: 60 },
                  email: { type: 'string', format: 'email', title: 'Email' },
                  age: { type: 'integer', title: 'Age', minimum: 18, maximum: 120 },
                  role: { $ref: '#/components/schemas/Role' },
                  website: { type: 'string', format: 'uri', title: 'Website' },
                },
                required: ['name', 'email', 'role'],
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Role: { type: 'string', title: 'Role', enum: ['admin', 'editor', 'viewer'] },
    },
  },
}

const schemaCode = `parseOpenAPI(document, { path: '/users', method: 'post' })

// document.components.schemas.Role:
{ type: 'string', enum: ['admin', 'editor', 'viewer'] }
// referenced from the request body via:
{ role: { $ref: '#/components/schemas/Role' } }`

const fields = parseOpenAPI(openapiDocument, { path: '/users', method: 'post' })
const submitted = ref<Record<string, unknown> | null>(null)

const form = useForm({
  schema: fields,
  validateOn: 'blur',
  onSubmit: async (data) => {
    await new Promise((r) => setTimeout(r, 400))
    submitted.value = data
  },
})

// Also usable directly on a plain JSON Schema object (no OpenAPI wrapper):
const plainSchema = parseJSONSchema({
  type: 'object',
  properties: { search: { type: 'string' } },
} as const)
</script>

<template>
  <div>
    <div class="page-header">
      <h2>OpenAPI / JSON Schema <span class="badge badge-json">Standard</span></h2>
      <p>
        Generate a form straight from an OpenAPI document's request body — no schema translation
        layer needed on the backend. <code>parseOpenAPI()</code> resolves <code>$ref</code>s against
        the document automatically; <code>parseJSONSchema()</code> works on a plain JSON Schema
        object directly.
      </p>
    </div>

    <div class="card">
      <div class="card-title">Usage</div>
      <pre class="code-block">{{ schemaCode }}</pre>
    </div>

    <div class="card">
      <FormRenderer :form="form" submit-label="Create user" />
    </div>

    <div v-if="submitted" class="card">
      <div class="card-title">✅ Submitted values</div>
      <pre class="values-preview">{{ JSON.stringify(submitted, null, 2) }}</pre>
    </div>

    <div class="card">
      <div class="card-title">Parsed fields</div>
      <pre class="values-preview">{{
        JSON.stringify(
          fields.map((f) => ({ name: f.name, type: f.type, label: f.label, required: f.required })),
          null,
          2,
        )
      }}</pre>
    </div>

    <p style="font-size: 0.78rem; color: var(--muted)">
      <code>parseJSONSchema()</code> also works standalone —
      <code>{{ plainSchema.map((f) => f.name).join(', ') }}</code> parsed from a plain schema with
      no OpenAPI wrapper.
    </p>
  </div>
</template>
