# **Form Schema**

![Form Schema](https://github.com/macrulezru/assets/blob/master/packages-images/vue-form-schema.png?raw=true)

Reactive forms from a declarative schema (JSON, Zod, Yup, or Valibot) for Vue 3. A headless, SSR-compatible alternative to VeeValidate / FormKit for forms that are generated dynamically or driven from the server.

---

## Features

- **Any schema source** — `FieldDefinition[]`, JSON array, Zod, Yup, Valibot, or standard JSON Schema / OpenAPI
- **Headless by default** — zero UI dependencies in the core; bring your own components
- **Reactive conditions** — `visible`, `disabled` accept a boolean, function, or string expression
- **Dynamic options** — sync and async `options` functions with dependency tracking (`optionsDeps`)
- **Dynamic array fields** — `type: 'array'` with `useFieldArray` composable (append / remove / move / swap)
- **Multi-step wizard** — `useMultiStepForm` with per-step validation and `MultiStepFormRenderer`
- **Validation** — sync + async validators, `validateMode: 'first' | 'all'`, `validateOn: 'eager'`
- **Cross-field** — `sameAs` validator; validators receive all current values as second argument
- **Transform & parse** — `transform` runs on every `setField`; `parse` runs at submit time
- **File upload** — `type: 'file'` with `fileType`, `fileSize`, `fileCount` validators; drag-and-drop UI
- **Custom components** — `field.component` + per-app and per-subtree component registry
- **Input masking** — phone (RU/EU), date, IBAN, INN, custom `#`/`A` patterns; no external deps
- **Schema composition** — `mergeSchemas`, `omitFields`, `pickFields`, `extendField`
- **Discriminated schemas** — `discriminatedFields` builds `visible` wiring for a field set that switches entirely by a discriminator value, with native `z.discriminatedUnion` / `v.variant` mapping
- **TypeScript inference** — `InferValues<T>` maps schema literals to typed values
- **Persisted forms** — `persist: 'local' | 'session'` with SSR-safe storage
- **Server-side validation errors** — `applyServerErrors` maps Laravel/DRF/flat/custom formats onto `errors`
- **Debug mode** — `debug: true` logs state changes; `useFormDebug` returns a reactive snapshot
- **Tailwind UI theme** — `vue-form-schema/ui/tailwind` subentry with utility-class components
- **shadcn / PrimeVue / Naive UI themes** — drop-in renderers for popular component libraries
- **Accessibility** — `aria-required`, `aria-invalid`, `aria-describedby`, `fieldset`/`legend` for radio
- **SSR-safe** — no direct browser APIs in the core
- **Tree-shakeable** — Zod/Yup/Valibot adapters and UI are separate entry points
- **Nuxt module** — [`@macrulez/nuxt-vue-form-schema`](https://npm.vuecraft.ru/en/packages/vue-form-schema/guide/nuxt-module.html) auto-imports composables, validators and schema adapters (source lives in [`packages/nuxt`](packages/nuxt), not yet published to npm)
- **Vue DevTools** — `vue-form-schema/devtools` adds a live forms inspector + timeline, zero cost when not installed

---

## When you'd reach for this

The backend already describes a form's shape in JSON Schema, OpenAPI, or a Zod type — vue-form-schema turns that description straight into a working form on screen, instead of manually duplicating the same fields and validation rules in a Vue component.

- **Some fields appear depending on others** — Picking "business" reveals a tax ID field, and "individual" reveals passport details, and the two shouldn't show at once — the form decides on its own which fields to show and validate based on what's already been chosen.
- **A form needs a list with a variable number of rows** — A list of phone numbers, invoice line items, or team members — the user adds and removes rows freely, and every new row gets validated and cleared the same way the first one was.
- **A long form is split into several steps** — A ten-screen questionnaire is intimidating shown all at once — the form is broken into steps with its own validation for each, and the next step only opens once the previous one checks out.
- **The server rejects a form for a reason the client never checked** — An email being already taken can only be discovered after submitting to the server. The response maps onto the right form fields in one call, so the email field itself turns red, not a generic "something went wrong" banner at the top.

---

## Installation

| Environment         | Minimum version                                  |
| ------------------- | ------------------------------------------------ |
| Node.js             | `20.12+`                                         |
| Vue                 | `3.3.0+` (required)                              |
| `zod`               | `3.22.0+` (optional — only for `/zod`)           |
| `yup`               | `1.3.0+` (optional — only for `/yup`)            |
| `valibot`           | `1.0.0+` (optional — only for `/valibot`)        |
| `primevue`          | `4.0.0+` (optional — only for `/ui/primevue`)    |
| `naive-ui`          | `2.38.0+` (optional — only for `/ui/naive`)      |
| `@vue/devtools-api` | `6+ / 7+ / 8+` (optional — only for `/devtools`) |

Unlike most packages in this catalog, Vue itself is a **required** peer dependency here, not optional — the core (`useForm`, validators, parsers) is Vue-specific, not framework-agnostic.

```bash
npm install @macrulez/vue-form-schema
```

Optional peer dependencies:

```bash
npm install zod       # Zod adapter
npm install yup       # Yup adapter
npm install valibot   # Valibot adapter
```

Using Nuxt? [`@macrulez/nuxt-vue-form-schema`](https://npm.vuecraft.ru/en/packages/vue-form-schema/guide/nuxt-module.html) auto-imports `useForm`, `useFieldArray`, the built-in validators, schema adapters and more. **Not yet published to npm** — the module lives in [`packages/nuxt`](packages/nuxt) of this repo; until it's released, install it directly from the repo/tarball, or call the composables from `@macrulez/vue-form-schema` yourself.

### Quick start

```vue
<script setup lang="ts">
import { useForm } from '@macrulez/vue-form-schema'
import type { FieldDefinition } from '@macrulez/vue-form-schema'

const schema: FieldDefinition[] = [
  { type: 'text', name: 'name', label: 'Full name', required: true },
  { type: 'email', name: 'email', label: 'Email', required: true },
  {
    type: 'select',
    name: 'role',
    label: 'Role',
    options: [
      { label: 'Admin', value: 'admin' },
      { label: 'User', value: 'user' },
    ],
  },
]

const { values, errors, touched, isValid, isSubmitting, submit, setField } = useForm({
  schema,
  validateOn: 'blur',
  onSubmit: async (data) => {
    await fetch('/api/users', { method: 'POST', body: JSON.stringify(data) })
  },
})
</script>

<template>
  <form @submit.prevent="submit">
    <div v-for="field in schema" :key="field.name">
      <label>{{ field.label }}</label>
      <input
        :type="field.type"
        :value="values[field.name]"
        @input="setField(field.name, ($event.target as HTMLInputElement).value)"
        @blur="touched[field.name] = true"
      />
      <span v-if="touched[field.name] && errors[field.name]">
        {{ errors[field.name][0] }}
      </span>
    </div>
    <button type="submit" :disabled="!isValid || isSubmitting">Submit</button>
  </form>
</template>
```

### More examples

#### A schema straight from Zod — typed out of the box

`parseZod()` turns an ordinary Zod schema into form fields — value types come from `z.infer<>`, no `useForm<Values>()` needed.

```ts
import { z } from 'zod'
import { parseZod } from '@macrulez/vue-form-schema/zod'
import { useForm } from '@macrulez/vue-form-schema'

const schema = z.object({
  name: z.string().min(2).describe('Full name'),
  age: z.number().min(0).optional(),
  email: z.string().email(),
  role: z.enum(['admin', 'user']),
})

const fields = parseZod(schema)
const { values } = useForm({ schema: fields })

// values.value.name is string, values.value.age is number | undefined, ...
// — inferred automatically from `schema` via z.infer<typeof schema>, no
// useForm<Values>(...) needed.
```

#### Fields that show and hide themselves

`visible` takes a function of the current values — the field only renders and validates while the condition holds, and `clearOnHide` resets it once hidden.

```ts
import type { FieldDefinition } from '@macrulez/vue-form-schema'
import { useForm } from '@macrulez/vue-form-schema'

const schema: FieldDefinition[] = [
  { type: 'checkbox', name: 'hasCompany', label: 'I represent a company' },
  {
    type: 'text',
    name: 'companyName',
    label: 'Company name',
    visible: (values) => values['hasCompany'] === true,
    required: true,
  },
]

const { values } = useForm({ schema, clearOnHide: true })
```

#### Backend errors land on the right fields automatically

`applyServerErrors` parses a Laravel/DRF response (or any shape via a custom mapper) and maps errors onto the right fields on its own — no hand-rolled response unwrapping per backend.

```ts
import { applyServerErrors } from '@macrulez/vue-form-schema'

const res = await fetch('/api/users', { method: 'POST', body: JSON.stringify(form.values.value) })

if (!res.ok) {
  const { formErrors } = applyServerErrors(form, await res.json(), { format: 'laravel' })
  if (formErrors.length) toast.error(formErrors[0]) // errors not tied to a field
}

// Built-in formats: 'laravel', 'drf', 'flat' — or pass your own mapper.
// The next client-side validation naturally replaces a stale server error.
```

---

## Documentation & links

- 📖 **Full documentation:** [npm.vuecraft.ru/en/packages/vue-form-schema](https://npm.vuecraft.ru/en/packages/vue-form-schema/guide/overview.html)
- 🌐 **VueCraft:** [vuecraft.ru/en](https://vuecraft.ru/en)
- 👤 **Author:** [macrulez.ru/en](https://macrulez.ru/en)
- 💻 **GitHub:** [macrulezru/vue-form-schema](https://github.com/macrulezru/vue-form-schema)
- 📦 **NPM:** [@macrulez/vue-form-schema](https://www.npmjs.com/package/@macrulez/vue-form-schema)
- 🐛 **Issues:** [github.com/macrulezru/vue-form-schema/issues](https://github.com/macrulezru/vue-form-schema/issues)

---

## License

MIT

---

## 💖 Support the project

Open source takes time and effort. If this library saves you time or brings value, consider supporting further development.

<a href="https://donate.cryptocloud.plus/M6O34NIN" target="_blank">
  <img src="https://img.shields.io/badge/Donate-CryptoCloud-8A2BE2?style=for-the-badge&logo=cryptocurrency&logoColor=white" alt="Donate via CryptoCloud">
</a>

Thank you for being part of this journey. ❤️
