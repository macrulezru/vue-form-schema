<script setup lang="ts">
// `useForm` and `required` are auto-imported by the module under test —
// no explicit import from '@macrulez/vue-form-schema' needed here.
const form = useForm({
  schema: [
    { type: 'text', name: 'name', label: 'Name', required: true, validators: [required] },
    { type: 'email', name: 'email', label: 'Email', required: true },
  ],
  onSubmit: async (values) => {
    // eslint-disable-next-line no-console
    console.log('submitted', values)
  },
})
</script>

<template>
  <div style="max-width: 420px; margin: 40px auto; font-family: sans-serif">
    <h1>Nuxt module playground</h1>
    <VfsFormRenderer :form="form" submit-label="Submit" />
    <pre>{{ form.values.value }}</pre>
  </div>
</template>
