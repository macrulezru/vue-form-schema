# vue-form-schema

Reactive forms from a declarative schema (JSON, Zod, or Yup) for Vue 3. A headless, SSR-compatible alternative to VeeValidate / FormKit for forms that are generated dynamically or driven from the server.

---

## Contents

- [Features](#features)
- [Demo](#demo)
- [Installation](#installation)
- [Quick start](#quick-start)
- [FieldDefinition reference](#fielddefinition-reference)
- [useForm composable](#useform-composable)
- [Schema formats](#schema-formats)
  - [FieldDefinition array](#fielddefinition-array)
  - [JSON schema](#json-schema)
  - [Zod](#zod)
  - [Yup](#yup)
- [Built-in validators](#built-in-validators)
- [Custom validators](#custom-validators)
- [Conditional fields](#conditional-fields)
- [Input masking](#input-masking)
- [FormRenderer UI component](#formrenderer-ui-component)
- [SSR compatibility](#ssr-compatibility)
- [TypeScript generics](#typescript-generics)
- [Architecture](#architecture)
- [Bundle size & peer dependencies](#bundle-size--peer-dependencies)

---

## Features

- **Any schema source** — define fields as a plain JSON array, a Zod object, or a Yup object
- **Headless by default** — zero UI dependencies in the core; bring your own components
- **Reactive conditions** — `visible`, `disabled`, and `required` accept a boolean, a function, or a string expression evaluated against live form values
- **Validation** — sync and async validators, built-in rules (`required`, `email`, `minLength`, …), cross-field access
- **Input masking** — phone (RU/EU), date, IBAN, INN, and custom `#`/`A` patterns; no external dependencies
- **SSR-safe** — no direct browser APIs in the core; validation and state work on the server
- **Tree-shakeable** — Zod/Yup adapters are separate entry points; the UI subpackage is optional
- **TypeScript 5+** — generic type inference flows from schema to `values`

---

## Demo

A local interactive demo covers all major features of the library. Clone the repo and run:

```bash
npm install
npm run demo
```

Opens at **http://localhost:5174** with the following examples:

| Page | What it shows |
|---|---|
| **Basic form** | `FieldDefinition[]` with built-in validators — `required`, `minLength`, `email`, `min/max` |
| **JSON schema** | Server-driven schema with rule-based validators (`{ rule: 'minLength', value: 3 }`) |
| **Zod schema** | `z.object()` → `parseZod()`, type inference, `.describe()` for labels |
| **Yup schema** | `yup.object()` → `parseYup()`, Yup constraints delegated to `validateSync` |
| **Conditional fields** | `visible` as a function and as a string expression; `clearOnHide` behaviour |
| **Input masking** | All presets + custom `#`/`A` patterns; standalone `applyMask` / `removeMask` playground |
| **FormRenderer** | Out-of-the-box rendering; slot overrides (`#field-{name}`, `#submit`); custom component map |

---

## Installation

```bash
npm install vue-form-schema
```

Peer dependencies:

```bash
npm install vue          # required
npm install zod          # optional — only if you use the Zod adapter
npm install yup          # optional — only if you use the Yup adapter
```

---

## Quick start

```vue
<script setup lang="ts">
import { useForm } from 'vue-form-schema'
import type { FieldDefinition } from 'vue-form-schema'

const schema: FieldDefinition[] = [
  { type: 'text',  name: 'name',  label: 'Full name', required: true },
  { type: 'email', name: 'email', label: 'Email',      required: true },
  {
    type: 'select',
    name: 'role',
    label: 'Role',
    options: [
      { label: 'Admin', value: 'admin' },
      { label: 'User',  value: 'user'  },
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

---

## FieldDefinition reference

Every field in your schema is described by a `FieldDefinition` object.

```ts
interface FieldDefinition {
  // ─── Required ─────────────────────────────────────────────────────────────
  type: 'text' | 'number' | 'email' | 'select' | 'checkbox'
      | 'radio' | 'textarea' | 'date' | 'array' | 'group'

  /** Flat dot-path key used in the values object, e.g. "address.city" */
  name: string

  // ─── Display ──────────────────────────────────────────────────────────────
  label?:       string
  placeholder?: string

  // ─── Initial value ────────────────────────────────────────────────────────
  defaultValue?: unknown   // set on mount and after reset()

  // ─── Constraints ──────────────────────────────────────────────────────────
  required?: boolean

  /** Static boolean, or a function receiving all current values */
  disabled?: boolean | ((values: Record<string, unknown>) => boolean)

  /**
   * Static boolean, a function, or a string expression.
   * String expressions have access to the `values` variable and support
   * arithmetic, comparison, logical operators.  Unsafe calls are blocked.
   */
  visible?: boolean | string | ((values: Record<string, unknown>) => boolean)

  // ─── Validation ───────────────────────────────────────────────────────────
  validators?:      ValidatorFn[]
  asyncValidators?: AsyncValidatorFn[]

  // ─── Masking ──────────────────────────────────────────────────────────────
  mask?: string | MaskConfig

  // ─── select / radio ───────────────────────────────────────────────────────
  options?: { label: string; value: unknown }[]

  // ─── group / array ────────────────────────────────────────────────────────
  fields?: FieldDefinition[]
}
```

### Nested fields

Use `type: 'group'` to create a named group of fields. Child field names must use dot-path notation so values are properly scoped.

```ts
const schema: FieldDefinition[] = [
  {
    type: 'group',
    name: 'address',
    label: 'Address',
    fields: [
      { type: 'text', name: 'address.city',    label: 'City',    required: true },
      { type: 'text', name: 'address.country', label: 'Country', required: true },
    ],
  },
]
```

The resulting `values` object will be `{ 'address.city': '...', 'address.country': '...' }`.

---

## useForm composable

```ts
import { useForm } from 'vue-form-schema'

const form = useForm(config)
```

### Config

| Property | Type | Default | Description |
|---|---|---|---|
| `schema` | `FieldDefinition[] \| JSONSchema` | — | Field definitions |
| `initialValues` | `Partial<T>` | `{}` | Seed values (override field defaults) |
| `validateOn` | `'input' \| 'blur' \| 'submit'` | `'blur'` | When sync validation is triggered |
| `clearOnHide` | `boolean` | `false` | Reset a field's value when it becomes hidden |
| `onSubmit` | `(values: T) => void \| Promise<void>` | — | Called after successful validation |

### Return value

| Property | Type | Description |
|---|---|---|
| `fields` | `ComputedRef<FieldDefinition[]>` | Field list after conditions are evaluated |
| `values` | `Ref<T>` | Current form values (reactive) |
| `errors` | `Ref<Record<string, string[]>>` | Validation errors keyed by field name |
| `touched` | `Ref<Record<string, boolean>>` | Whether a field has been interacted with |
| `isDirty` | `ComputedRef<boolean>` | `true` when values differ from the initial state |
| `isValid` | `ComputedRef<boolean>` | `true` when all visible fields pass validation |
| `isSubmitting` | `Ref<boolean>` | `true` while `onSubmit` is running |
| `submit()` | `() => Promise<void>` | Touch all fields, validate, call `onSubmit` |
| `reset(values?)` | `(values?: Partial<T>) => void` | Restore initial state (or supply new values) |
| `setField(path, value)` | `(path: string, value: unknown) => void` | Programmatically set a value |
| `getField(path)` | `(path: string) => unknown` | Read a value by dot-path |

### Example — programmatic control

```ts
const { setField, getField, reset } = useForm({ schema })

// Set a nested field
setField('address.city', 'Berlin')

// Read it back
console.log(getField('address.city')) // 'Berlin'

// Reset to schema defaults
reset()

// Reset to specific values
reset({ name: 'Alice', email: 'alice@example.com' })
```

---

## Schema formats

### FieldDefinition array

The native format — an array of `FieldDefinition` objects, usually created from the parser functions or manually:

```ts
import type { FieldDefinition } from 'vue-form-schema'

const schema: FieldDefinition[] = [
  { type: 'text', name: 'username', required: true },
]

useForm({ schema })
```

### JSON schema

A serialisable array format useful when the schema arrives from an API. Validators are expressed as named rules instead of functions. Pass directly to `useForm` or call `parseJSON` explicitly.

```ts
import { parseJSON } from 'vue-form-schema'

const raw = [
  {
    type: 'text',
    name: 'username',
    label: 'Username',
    default: '',
    required: true,
    validators: [
      { rule: 'minLength', value: 3, message: 'At least 3 characters' },
      { rule: 'maxLength', value: 20 },
    ],
  },
  {
    type: 'email',
    name: 'email',
    validators: [{ rule: 'email' }],
  },
]

// Option A — pass directly to useForm (auto-detected)
useForm({ schema: raw })

// Option B — parse explicitly
const fields = parseJSON(raw)
useForm({ schema: fields })
```

**Supported JSON validator rules:**

| Rule | Parameter | Example |
|---|---|---|
| `required` | — | `{ rule: 'required' }` |
| `minLength` | `value: number` | `{ rule: 'minLength', value: 2 }` |
| `maxLength` | `value: number` | `{ rule: 'maxLength', value: 100 }` |
| `min` | `value: number` | `{ rule: 'min', value: 0 }` |
| `max` | `value: number` | `{ rule: 'max', value: 9999 }` |
| `pattern` | `value: string` (regex) | `{ rule: 'pattern', value: '^[a-z]+$' }` |
| `email` | — | `{ rule: 'email' }` |
| `url` | — | `{ rule: 'url' }` |

All rules accept an optional `message` string to override the default error text.

### Zod

Install Zod and import the adapter from `vue-form-schema/zod`:

```ts
import { z } from 'zod'
import { parseZod } from 'vue-form-schema/zod'
import { useForm } from 'vue-form-schema'

const schema = z.object({
  name:  z.string().min(2).describe('Full name'),
  age:   z.number().min(0).optional(),
  email: z.string().email(),
  role:  z.enum(['admin', 'user']),
})

const fields = parseZod(schema)

const { values, submit } = useForm({ schema: fields })
```

Type inference is preserved — `values` will be typed as the Zod schema's output type when you supply it explicitly:

```ts
type FormData = z.infer<typeof schema>

const { values } = useForm<FormData>({ schema: fields })
// values.value.name is string
```

**Zod type mapping:**

| Zod type | Field type |
|---|---|
| `z.string()` | `text` |
| `z.number()` | `number` |
| `z.boolean()` | `checkbox` |
| `z.enum(...)` | `select` |
| `z.array(...)` | `array` |
| `z.object(...)` | `group` |

Use `.describe('label text')` on any field to set the `label`.

### Yup

Install Yup and import the adapter from `vue-form-schema/yup`:

```ts
import { object, string, number } from 'yup'
import { parseYup } from 'vue-form-schema/yup'
import { useForm } from 'vue-form-schema'

const schema = object({
  name:  string().required().label('Full name'),
  email: string().email().required(),
  age:   number().min(0).optional(),
})

const fields = parseYup(schema)

const { values, submit } = useForm({ schema: fields })
```

**Yup type mapping:**

| Yup type | Field type |
|---|---|
| `string()` | `text` |
| `number()` | `number` |
| `boolean()` | `checkbox` |
| `array()` | `array` |
| `object()` | `group` |

---

## Built-in validators

Import standalone validator functions when building a `FieldDefinition` array manually:

```ts
import {
  required,
  minLength,
  maxLength,
  min,
  max,
  pattern,
  email,
  url,
} from 'vue-form-schema'
```

| Function | Signature | Description |
|---|---|---|
| `required` | `ValidatorFn` | Fails for `null`, `undefined`, `''`, or empty array |
| `minLength(n, msg?)` | `(n: number) => ValidatorFn` | Min length for string or array |
| `maxLength(n, msg?)` | `(n: number) => ValidatorFn` | Max length for string or array |
| `min(n, msg?)` | `(n: number) => ValidatorFn` | Numeric minimum |
| `max(n, msg?)` | `(n: number) => ValidatorFn` | Numeric maximum |
| `pattern(re, msg?)` | `(re: RegExp) => ValidatorFn` | Regex match |
| `email` | `ValidatorFn` | Basic email format check |
| `url` | `ValidatorFn` | Valid URL (uses `new URL()`) |

```ts
import { minLength, maxLength, email } from 'vue-form-schema'

const schema: FieldDefinition[] = [
  {
    type: 'text',
    name: 'username',
    required: true,
    validators: [
      minLength(3, 'At least 3 characters'),
      maxLength(20),
    ],
  },
  {
    type: 'email',
    name: 'email',
    validators: [email],
  },
]
```

---

## Custom validators

### Sync validator

A `ValidatorFn` receives the field's current value and all form values. Return a string on failure, or `null` on success.

```ts
import type { ValidatorFn } from 'vue-form-schema'

const noSpaces: ValidatorFn = (value) => {
  if (typeof value === 'string' && value.includes(' ')) return 'No spaces allowed'
  return null
}

// Cross-field: confirm password
const matchesPassword: ValidatorFn = (value, allValues) => {
  if (value !== allValues['password']) return 'Passwords do not match'
  return null
}

const schema: FieldDefinition[] = [
  { type: 'text', name: 'password', label: 'Password' },
  {
    type: 'text',
    name: 'confirmPassword',
    label: 'Confirm password',
    validators: [matchesPassword],
  },
]
```

### Async validator

An `AsyncValidatorFn` returns a `Promise<string | null>`. Async validators are debounced (300 ms by default) so they don't fire on every keystroke.

```ts
import type { AsyncValidatorFn } from 'vue-form-schema'

const uniqueUsername: AsyncValidatorFn = async (value) => {
  const res = await fetch(`/api/check-username?q=${value}`)
  const { taken } = await res.json()
  return taken ? 'This username is already taken' : null
}

const schema: FieldDefinition[] = [
  {
    type: 'text',
    name: 'username',
    required: true,
    asyncValidators: [uniqueUsername],
  },
]
```

---

## Conditional fields

`visible` and `disabled` can be a static boolean, a reactive function, or a safe string expression.

### Function condition

```ts
const schema: FieldDefinition[] = [
  {
    type: 'checkbox',
    name: 'hasCompany',
    label: 'I represent a company',
  },
  {
    type: 'text',
    name: 'companyName',
    label: 'Company name',
    required: true,
    // shown only when hasCompany is checked
    visible: (values) => values['hasCompany'] === true,
  },
  {
    type: 'text',
    name: 'vat',
    label: 'VAT number',
    // disabled unless company name is entered
    disabled: (values) => !values['companyName'],
  },
]
```

### String expression

String expressions have access to a `values` variable. Arithmetic, comparison, and logical operators are supported. Potentially unsafe calls (`fetch`, `eval`, etc.) are rejected by a whitelist check.

```ts
const schema: FieldDefinition[] = [
  { type: 'number', name: 'age', label: 'Age' },
  {
    type: 'select',
    name: 'alcoholChoice',
    label: 'Drink preference',
    visible: 'values.age >= 18',         // string expression
    options: [
      { label: 'Beer',  value: 'beer'  },
      { label: 'Wine',  value: 'wine'  },
      { label: 'Water', value: 'water' },
    ],
  },
]
```

### clearOnHide

When `clearOnHide: true` is set in `useForm`, hiding a field resets its value back to `defaultValue` (or `null`).

```ts
useForm({
  schema,
  clearOnHide: true,
})
```

---

## Input masking

Masks format user input in real time. They are applied automatically inside `FormRenderer` and can be used standalone via the `applyMask` / `removeMask` / `bindMask` functions.

### Mask presets

| Preset | Pattern | Example output |
|---|---|---|
| `phone-ru` | `+7 (###) ###-##-##` | `+7 (916) 123-45-67` |
| `phone-eu` | `+## (##) ###-##-##` | `+49 (30) 123-45-67` |
| `date` | `##.##.####` | `01.01.2024` |
| `inn` | `############` | `123456789012` |
| `iban` | `AA## #### #### #### #### #### ####` | `GB29 NWBK 6016 ...` |

```ts
// Using a preset
const field: FieldDefinition = {
  type: 'text',
  name: 'phone',
  label: 'Phone',
  mask: { preset: 'phone-ru' },
}
```

### Custom patterns

- `#` — matches a single digit (0–9)
- `A` — matches a single letter (a–z, A–Z); output is uppercased
- Any other character — treated as a fixed literal

```ts
// Postcode: two letters + four digits
const field: FieldDefinition = {
  type: 'text',
  name: 'postcode',
  label: 'Postcode',
  mask: { pattern: 'AA####' },  // e.g. AB1234
}
```

### Standalone mask API

```ts
import { applyMask, removeMask, bindMask } from 'vue-form-schema'

// Format a raw value
applyMask('9161234567', { preset: 'phone-ru' })
// → '+7 (916) 123-45-67'

// Strip mask literals from a formatted value
removeMask('+7 (916) 123-45-67', { preset: 'phone-ru' })
// → '9161234567'

// Attach to a native <input> element (returns cleanup fn)
const cleanup = bindMask(inputElement, { preset: 'date' })
// call cleanup() in onUnmounted
```

---

## FormRenderer UI component

`FormRenderer` is in the optional `vue-form-schema/ui` subpackage. It renders fields automatically from the schema and delegates display to built-in or custom components.

```ts
import { FormRenderer } from 'vue-form-schema/ui'
```

### Basic usage

```vue
<script setup lang="ts">
import { useForm } from 'vue-form-schema'
import { FormRenderer } from 'vue-form-schema/ui'

const form = useForm({ schema, onSubmit })
</script>

<template>
  <FormRenderer :form="form" submit-label="Save" />
</template>
```

### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `form` | `UseFormReturn` | — | Return value of `useForm` |
| `components` | `Partial<Record<FieldType, Component>>` | built-ins | Override per-type renderers |
| `submitLabel` | `string` | `'Submit'` | Submit button text |

### Slots

| Slot | Scope | Description |
|---|---|---|
| `#field-{name}` | `{ field, value, error, touched, setValue, touch }` | Replace the entire field |
| `#label-{name}` | `{ field }` | Replace the field label |
| `#error-{name}` | `{ field, error }` | Replace the error display |
| `#submit` | `{ isSubmitting, isValid }` | Replace the submit button |

### Custom field renderers

Pass a `components` map to swap built-in inputs with your own (e.g. Element Plus, Naive UI):

```vue
<script setup lang="ts">
import { ElInput, ElSelect } from 'element-plus'

const myComponents = { text: ElInput, select: ElSelect }
</script>

<template>
  <FormRenderer :form="form" :components="myComponents" />
</template>
```

### Per-field slot override

```vue
<template>
  <FormRenderer :form="form">
    <!-- replace the "avatar" field entirely -->
    <template #field-avatar="{ value, setValue }">
      <AvatarUploader :model-value="value" @update:model-value="setValue" />
    </template>

    <!-- custom submit -->
    <template #submit="{ isSubmitting }">
      <MyButton type="submit" :loading="isSubmitting">Save profile</MyButton>
    </template>
  </FormRenderer>
</template>
```

### Built-in field components

The following components are exported from `vue-form-schema/ui` and can be used independently:

| Component | Types |
|---|---|
| `TextField` | `text`, `email` |
| `NumberField` | `number` |
| `TextareaField` | `textarea` |
| `SelectField` | `select` |
| `CheckboxField` | `checkbox` |
| `RadioField` | `radio` |
| `DateField` | `date` |

---

## SSR compatibility

The core package (`useForm`, validators, parsers, `ConditionEvaluator`) does not use any browser-specific APIs. State management and validation work on the server.

`bindMask` and `FormRenderer` use DOM APIs (`HTMLInputElement`, event listeners) and should only be called or mounted on the client side. Gate them with `onMounted` or Vue's `<ClientOnly>` wrapper as needed.

---

## TypeScript generics

`useForm` is generic over the shape of the values object. Supply the type explicitly to get full inference on `values.value`:

```ts
interface UserForm {
  name: string
  email: string
  age: number | null
  role: 'admin' | 'user'
}

const { values, submit } = useForm<UserForm>({
  schema,
  onSubmit: (data) => {
    // data is typed as UserForm
    console.log(data.name)
  },
})

// values.value is Ref<UserForm>
```

### Validator function types

```ts
import type { ValidatorFn, AsyncValidatorFn } from 'vue-form-schema'

// Sync: (value, allValues) => string | null
const myValidator: ValidatorFn = (value, allValues) => {
  return String(value).length > 0 ? null : 'Required'
}

// Async: (value, allValues) => Promise<string | null>
const myAsyncValidator: AsyncValidatorFn = async (value) => {
  const ok = await checkServer(value)
  return ok ? null : 'Not available'
}
```

---

## Architecture

```
useForm
  │
  ├── SchemaParser (json / zod / yup)
  │     └── FieldDefinition[]
  │
  ├── ConditionEvaluator
  │     reactive watchEffect → resolves visible / disabled per field
  │
  ├── ValidationEngine
  │     sync validators   → errors Record<path, string[]>
  │     async validators  → debounced, merged into errors
  │
  ├── MaskEngine (standalone)
  │     applyMask / removeMask / bindMask
  │
  └── (optional) FormRenderer [/ui]
        renders FieldDefinition[] → input components
        slots: #field-{name}, #label-{name}, #error-{name}, #submit
```

**Module dependency graph:**

```
index.ts
├── core/types.ts
├── core/useForm.ts
│   ├── core/ValidationEngine.ts
│   ├── core/ConditionEvaluator.ts
│   └── parsers/json.ts
├── core/MaskEngine.ts
├── parsers/zod.ts  ← vue-form-schema/zod
└── parsers/yup.ts  ← vue-form-schema/yup

ui/index.ts         ← vue-form-schema/ui
├── ui/FormRenderer.vue
└── ui/fields/*.vue
```

---

## Bundle size & peer dependencies

| Entry point | Peer deps | Notes |
|---|---|---|
| `vue-form-schema` | `vue ^3.3` | Core ≤ 8 KB gzip |
| `vue-form-schema/zod` | `zod ^3` | Lazy — zero cost if unused |
| `vue-form-schema/yup` | `yup ^1` | Lazy — zero cost if unused |
| `vue-form-schema/ui` | `vue ^3.3` | Optional UI layer |

All entry points are tree-shakeable ESM + CJS dual builds.

---

## License

MIT

---

## Author

Danil Lisin Vladimirovich aka Macrulez

GitHub: [macrulezru](https://github.com/macrulezru) · Website: [macrulez.ru/en](https://macrulez.ru/en)

Questions and bugs — [issues](https://github.com/macrulezru/vue-form-schema/issues)
