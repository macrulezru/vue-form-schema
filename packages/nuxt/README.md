# @macrulez/nuxt-vue-form-schema

Nuxt module for [@macrulez/vue-form-schema](https://github.com/macrulezru/vue-form-schema) — auto-imports composables, schema adapters and (optionally) the headless UI components. No manual `import` statements needed for the library's public API inside your Nuxt app.

## Installation

```bash
npm install @macrulez/nuxt-vue-form-schema
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@macrulez/nuxt-vue-form-schema'],
})
```

That's it — `useForm`, `useFieldArray`, `useMultiStepForm`, `parseZod`/`parseYup`/`parseValibot`, the built-in validators (`required`, `minLength`, ...) and the schema-composition helpers (`mergeSchemas`, `pickFields`, ...) are now auto-imported wherever you use them, same as Nuxt's own composables.

```vue
<script setup lang="ts">
const form = useForm({
  schema: [{ type: 'text', name: 'email', required: true }],
  onSubmit: async (values) => {
    /* ... */
  },
})
</script>
```

## Module options

```ts
export default defineNuxtConfig({
  modules: ['@macrulez/nuxt-vue-form-schema'],
  vueFormSchema: {
    // Auto-import composables/validators/adapters (default: true)
    autoImports: true,
    // Also register FormRenderer/MultiStepFormRenderer as global
    // components, prefixed `Vfs*` to avoid name clashes (default: false)
    components: false,
  },
})
```

With `components: true`:

```vue
<template>
  <VfsFormRenderer :form="form" submit-label="Save" />
</template>
```

## SSR

The core library (`useForm`, validators, parsers) does not touch browser APIs, so it works the same way during SSR as any other Nuxt composable. Optional peer dependencies (`zod`/`yup`/`valibot`) still need to be installed in your app if you use the corresponding `parse*` adapter — the module does not bundle them.

## Development

```bash
npm install
npm run dev:prepare  # generates the .nuxt/ types the playground needs
npm run dev          # runs the playground app
npm run build        # builds the module for publishing
```

## License

MIT
