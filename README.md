# vue-form-schema

Reactive forms from a declarative schema (JSON, Zod, Yup, or Valibot) for Vue 3. A headless, SSR-compatible alternative to VeeValidate / FormKit for forms that are generated dynamically or driven from the server.

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
  - [Valibot](#valibot)
- [Built-in validators](#built-in-validators)
- [Custom validators](#custom-validators)
- [Cross-field validation](#cross-field-validation)
- [Conditional fields](#conditional-fields)
- [Dynamic options](#dynamic-options)
- [Dynamic array fields](#dynamic-array-fields)
- [Multi-step forms](#multi-step-forms)
- [Field transform & parse](#field-transform--parse)
- [File upload field](#file-upload-field)
- [Custom field components](#custom-field-components)
- [Component registry](#component-registry)
- [Input masking](#input-masking)
- [Schema composition](#schema-composition)
- [TypeScript inference](#typescript-inference)
- [Persisted forms](#persisted-forms)
- [Debug mode](#debug-mode)
- [FormRenderer UI component](#formrenderer-ui-component)
- [Tailwind UI theme](#tailwind-ui-theme)
- [Accessibility](#accessibility)
- [SSR compatibility](#ssr-compatibility)
- [Architecture](#architecture)
- [Bundle size & peer dependencies](#bundle-size--peer-dependencies)

---

## Features

- **Any schema source** — `FieldDefinition[]`, JSON array, Zod, Yup, or Valibot
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
- **TypeScript inference** — `InferValues<T>` maps schema literals to typed values
- **Persisted forms** — `persist: 'local' | 'session'` with SSR-safe storage
- **Debug mode** — `debug: true` logs state changes; `useFormDebug` returns a reactive snapshot
- **Tailwind UI theme** — `vue-form-schema/ui/tailwind` subentry with utility-class components
- **Accessibility** — `aria-required`, `aria-invalid`, `aria-describedby`, `fieldset`/`legend` for radio
- **SSR-safe** — no direct browser APIs in the core
- **Tree-shakeable** — Zod/Yup/Valibot adapters and UI are separate entry points

---

## Demo

```bash
npm install
npm run demo
```

Opens at **http://localhost:5174**:

| Page | What it shows |
|---|---|
| **Basic form** | `FieldDefinition[]` with built-in validators |
| **JSON schema** | Server-driven schema with rule-based validators |
| **Zod schema** | `parseZod()` with type inference |
| **Yup schema** | `parseYup()` with Yup constraints |
| **Conditional fields** | `visible` / `disabled` as function and string expression |
| **Input masking** | All presets + custom patterns |
| **FormRenderer** | Slot overrides, custom component map |
| **Array fields** | `type: 'array'` + `useFieldArray` API |
| **Multi-step wizard** | `useMultiStepForm` + step progress |
| **Dependent fields** | Sync/async function options, `defaultValue` as function |
| **Custom registry** | `provideRegistry` replaces built-in checkbox with PillToggle |
| **File upload** | Drag-and-drop, `fileType`/`fileSize`/`fileCount` validators |
| **Tailwind theme** | Default `FormRenderer` vs `TailwindFormRenderer` side by side |
| **Accessibility** | `aria-*` attributes, `fieldset`/`legend` for radio groups |

---

## Installation

```bash
npm install @macrulez/vue-form-schema
```

Optional peer dependencies:

```bash
npm install zod       # Zod adapter
npm install yup       # Yup adapter
npm install valibot   # Valibot adapter
```

---

## Quick start

```vue
<script setup lang="ts">
import { useForm } from '@macrulez/vue-form-schema'
import type { FieldDefinition } from '@macrulez/vue-form-schema'

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

Or use `FormRenderer` for zero-markup rendering:

```vue
<script setup lang="ts">
import { useForm } from '@macrulez/vue-form-schema'
import { FormRenderer } from '@macrulez/vue-form-schema/ui'

const form = useForm({ schema, onSubmit })
</script>

<template>
  <FormRenderer :form="form" submit-label="Save" />
</template>
```

---

## FieldDefinition reference

```ts
interface FieldDefinition {
  // ─── Required ─────────────────────────────────────────────────────────────
  type: 'text' | 'number' | 'email' | 'select' | 'checkbox'
      | 'radio' | 'textarea' | 'date' | 'array' | 'group' | 'file'

  /** Flat dot-path key in the values object, e.g. "address.city" */
  name: string

  // ─── Display ──────────────────────────────────────────────────────────────
  label?:       string
  placeholder?: string

  // ─── Initial value ────────────────────────────────────────────────────────
  /** Static value or a function called at init with already-resolved partial values */
  defaultValue?: unknown | ((values: Record<string, unknown>) => unknown)

  // ─── Constraints ──────────────────────────────────────────────────────────
  required?: boolean
  disabled?: boolean | ((values: Record<string, unknown>) => boolean)
  /** Boolean, function, or string expression evaluated against live values */
  visible?:  boolean | string | ((values: Record<string, unknown>) => boolean)

  // ─── Validation ───────────────────────────────────────────────────────────
  validators?:      ValidatorFn[]
  asyncValidators?: AsyncValidatorFn[]

  // ─── Masking ──────────────────────────────────────────────────────────────
  mask?: string | MaskConfig

  // ─── select / radio options ───────────────────────────────────────────────
  /** Static array, sync function, or async function */
  options?: FieldOption[]
          | ((values: Record<string, unknown>) => FieldOption[])
          | ((values: Record<string, unknown>) => Promise<FieldOption[]>)
  /** Field names that trigger async options re-fetch when their values change */
  optionsDeps?: string[]

  // ─── group / array ────────────────────────────────────────────────────────
  fields?: FieldDefinition[]

  // ─── transform / parse ────────────────────────────────────────────────────
  /** Applied on every setField call — use for trim, coercion, formatting */
  transform?: (value: unknown, values: Record<string, unknown>) => unknown
  /** Applied at submit time to produce the final payload value */
  parse?: (raw: unknown) => unknown

  // ─── Custom component ─────────────────────────────────────────────────────
  /** Vue component or registered name; receives FormFieldProps */
  component?: Component | string

  // ─── File field options ───────────────────────────────────────────────────
  accept?:   string   // passed to <input accept>
  multiple?: boolean
  maxSize?:  number   // bytes (informational; use fileSize validator to enforce)
  maxFiles?: number   // informational; use fileCount validator to enforce
}
```

---

## useForm composable

```ts
import { useForm } from '@macrulez/vue-form-schema'
const form = useForm(config)
```

### Config

| Property | Type | Default | Description |
|---|---|---|---|
| `schema` | `FieldDefinition[] \| JSONSchema` | — | Field definitions |
| `initialValues` | `Partial<T>` | `{}` | Seed values (override field defaults) |
| `validateOn` | `'input' \| 'blur' \| 'submit' \| 'eager'` | `'blur'` | When validation fires |
| `validateMode` | `'first' \| 'all'` | `'first'` | Return first error only, or all errors |
| `clearOnHide` | `boolean` | `false` | Reset field value when it becomes hidden |
| `onSubmit` | `(values: T) => void \| Promise<void>` | — | Called after successful validation |
| `persist` | `false \| 'session' \| 'local'` | `false` | Persist values to sessionStorage / localStorage |
| `persistKey` | `string` | auto | Storage key prefix |
| `debug` | `boolean` | `false` | Log state changes to `console.group` |

### Return value

| Property | Type | Description |
|---|---|---|
| `fields` | `ComputedRef<FieldDefinition[]>` | Fields after conditions are evaluated |
| `values` | `Ref<T>` | Current form values |
| `errors` | `Ref<Record<string, string[]>>` | Validation errors keyed by field name |
| `touched` | `Ref<Record<string, boolean>>` | Fields that have been blurred |
| `optionsLoading` | `Ref<Record<string, boolean>>` | Async options loading state per field |
| `isDirty` | `ComputedRef<boolean>` | `true` when values differ from initial state |
| `isValid` | `ComputedRef<boolean>` | `true` when all visible fields pass validation |
| `isSubmitting` | `Ref<boolean>` | `true` while `onSubmit` is running |
| `submit()` | `() => Promise<void>` | Touch all fields, validate, call `onSubmit` |
| `reset(values?)` | — | Restore initial state or supply new values |
| `setField(path, value)` | — | Set a value by dot-path |
| `getField(path)` | — | Read a value by dot-path |

### `validateOn: 'eager'`

With `'eager'`, validation runs on input — but only after the field has been blurred at least once. This avoids showing errors while the user is still typing for the first time.

---

## Schema formats

### FieldDefinition array

```ts
import type { FieldDefinition } from '@macrulez/vue-form-schema'

const schema: FieldDefinition[] = [
  { type: 'text', name: 'username', required: true },
]
useForm({ schema })
```

### JSON schema

A serialisable format for server-driven schemas. Pass directly to `useForm` (auto-detected) or call `parseJSON` explicitly.

```ts
const raw = [
  {
    type: 'text',
    name: 'username',
    default: '',
    required: true,
    validators: [
      { rule: 'minLength', value: 3, message: 'At least 3 characters' },
      { rule: 'maxLength', value: 20 },
    ],
  },
]

useForm({ schema: raw })            // auto-detected
// or
import { parseJSON } from '@macrulez/vue-form-schema'
const fields = parseJSON(raw)
```

**Supported JSON validator rules:** `required`, `minLength`, `maxLength`, `min`, `max`, `pattern`, `email`, `url`. All accept an optional `message` override.

### Zod

```ts
import { z } from 'zod'
import { parseZod } from '@macrulez/vue-form-schema/zod'

const schema = z.object({
  name:  z.string().min(2).describe('Full name'),
  age:   z.number().min(0).optional(),
  email: z.string().email(),
  role:  z.enum(['admin', 'user']),
})

const fields = parseZod(schema)
const { values } = useForm({ schema: fields })
```

**Zod → field type mapping:** `z.string()` → `text`, `z.number()` → `number`, `z.boolean()` → `checkbox`, `z.enum()` → `select`, `z.array()` → `array`, `z.object()` → `group`. Use `.describe('label')` to set the field label.

### Yup

```ts
import { object, string, number } from 'yup'
import { parseYup } from '@macrulez/vue-form-schema/yup'

const schema = object({
  name:  string().required().label('Full name'),
  email: string().email().required(),
  age:   number().min(0).optional(),
})

const fields = parseYup(schema)
const { values } = useForm({ schema: fields })
```

### Valibot

```ts
import * as v from 'valibot'
import { parseValibot } from '@macrulez/vue-form-schema/valibot'

const schema = v.object({
  name:  v.pipe(v.string(), v.minLength(2)),
  email: v.pipe(v.string(), v.email()),
  age:   v.optional(v.number()),
  role:  v.picklist(['admin', 'user']),
})

const fields = parseValibot(schema)
const { values } = useForm({ schema: fields })
```

**Valibot → field type mapping:** `v.string()` → `text`, `v.number()` → `number`, `v.boolean()` → `checkbox`, `v.picklist()` / `v.enum()` → `select`, `v.array()` → `array`, `v.object()` → `group`. `v.pipe(v.string(), v.email())` → `type: 'email'`. `v.optional()` / `v.nullable()` → `required: false`.

---

## Built-in validators

```ts
import {
  required, minLength, maxLength, min, max, pattern, email, url,
  sameAs,
  fileType, fileSize, fileCount,
} from '@macrulez/vue-form-schema'
```

| Function | Description |
|---|---|
| `required` | Fails for `null`, `undefined`, `''`, or empty array |
| `minLength(n, msg?)` | Min length for string or array |
| `maxLength(n, msg?)` | Max length for string or array |
| `min(n, msg?)` | Numeric minimum |
| `max(n, msg?)` | Numeric maximum |
| `pattern(re, msg?)` | Regex match |
| `email` | Basic email format |
| `url` | Valid URL (`new URL()`) |
| `sameAs(field, msg?)` | Value must equal another field |
| `fileType(types[], msg?)` | File MIME type or extension whitelist |
| `fileSize(bytes, msg?)` | Max file size |
| `fileCount(n, msg?)` | Max number of files |

---

## Custom validators

### Sync

```ts
import type { ValidatorFn } from '@macrulez/vue-form-schema'

const noSpaces: ValidatorFn = (value) =>
  typeof value === 'string' && value.includes(' ') ? 'No spaces allowed' : null
```

### Async

Async validators are debounced (300 ms). Errors are merged into `errors` after resolution.

```ts
import type { AsyncValidatorFn } from '@macrulez/vue-form-schema'

const uniqueUsername: AsyncValidatorFn = async (value) => {
  const { taken } = await fetch(`/api/check?q=${value}`).then((r) => r.json())
  return taken ? 'Username is taken' : null
}
```

### Multiple errors per field (`validateMode`)

```ts
useForm({
  schema,
  validateMode: 'all',   // collect all errors per field (default: 'first')
})
```

---

## Cross-field validation

Use `sameAs` for password confirmation or write a custom validator — all validators receive `allValues` as the second argument.

```ts
import { sameAs } from '@macrulez/vue-form-schema'

const schema: FieldDefinition[] = [
  { type: 'text', name: 'password', label: 'Password', required: true },
  {
    type: 'text',
    name: 'confirm',
    label: 'Confirm password',
    validators: [sameAs('password', 'Passwords must match')],
  },
]
```

---

## Conditional fields

`visible` and `disabled` can be a boolean, a reactive function, or a safe string expression.

```ts
const schema: FieldDefinition[] = [
  { type: 'checkbox', name: 'hasCompany', label: 'I represent a company' },
  {
    type: 'text',
    name: 'companyName',
    label: 'Company name',
    visible: (values) => values['hasCompany'] === true,
    required: true,
  },
  // string expression — has access to the `values` variable
  {
    type: 'select',
    name: 'drink',
    label: 'Drink',
    visible: 'values.age >= 18',
    options: [{ label: 'Beer', value: 'beer' }, { label: 'Water', value: 'water' }],
  },
]
```

Set `clearOnHide: true` in `useForm` to automatically reset a hidden field's value.

---

## Dynamic options

`options` can be a static array, a **sync function**, or an **async function**.

```ts
// Sync — re-evaluated on every values change
{
  type: 'select',
  name: 'city',
  options: (values) => citiesByCountry[values['country'] as string] ?? [],
}

// Async — fetched on mount and re-fetched when optionsDeps change
{
  type: 'select',
  name: 'framework',
  optionsDeps: ['language'],
  options: async (values) => {
    const res = await fetch(`/api/frameworks?lang=${values['language']}`)
    return res.json()
  },
}
```

While loading, `optionsLoading.value['framework']` is `true` and the select is disabled in `FormRenderer`. Access the loading state directly via `form.optionsLoading`.

### Computed `defaultValue`

`defaultValue` can also be a function evaluated at form initialisation with already-resolved partial values as context:

```ts
{
  type: 'text',
  name: 'displayName',
  defaultValue: (values) => `${values.firstName} ${values.lastName}`,
}
```

---

## Dynamic array fields

### Schema definition

```ts
const schema: FieldDefinition[] = [
  {
    type: 'array',
    name: 'members',
    label: 'Team members',
    fields: [
      { type: 'text',  name: 'members.name',  label: 'Name',  required: true },
      { type: 'email', name: 'members.email', label: 'Email', required: true },
    ],
  },
]
```

`FormRenderer` renders an `ArrayField` automatically with Add / Remove buttons.

### `useFieldArray` composable

```ts
import { useFieldArray } from '@macrulez/vue-form-schema'

const { rows, count, append, prepend, remove, move, swap, replace } =
  useFieldArray(form, 'members')
```

| Method | Description |
|---|---|
| `append(defaults?)` | Add a row at the end |
| `prepend(defaults?)` | Add a row at the beginning |
| `remove(index)` | Remove a row |
| `move(from, to)` | Move a row |
| `swap(a, b)` | Swap two rows |
| `replace(index, defaults?)` | Replace a row with fresh defaults |

`rows` is a `ComputedRef<FieldArrayRow[]>`. Each row exposes `index`, `key`, and `fields` — the nested `FieldDefinition[]` with prefixed paths for that row.

---

## Multi-step forms

```ts
import { useMultiStepForm } from '@macrulez/vue-form-schema'

const wizard = useMultiStepForm(
  [
    { title: 'Account', schema: accountFields },
    { title: 'Profile', schema: profileFields },
    { title: 'Confirm', schema: confirmFields },
  ],
  async (allValues) => {
    await api.register(allValues)
  },
)
```

| Property / Method | Description |
|---|---|
| `currentStep` | `Ref<number>` — 0-based index |
| `totalSteps` | Number of steps |
| `isFirstStep` / `isLastStep` | `ComputedRef<boolean>` |
| `form` | `UseFormReturn` for the current step |
| `values` | All values across all steps merged |
| `next()` | Validate current step then advance (returns `false` if invalid) |
| `back()` | Go to previous step |
| `goTo(n)` | Jump to step `n` |
| `submit()` | Validate all steps then call `onSubmit` |

### `MultiStepFormRenderer`

```vue
import { MultiStepFormRenderer } from '@macrulez/vue-form-schema/ui'

<MultiStepFormRenderer :wizard="wizard" />
```

Renders the current step's fields and Back / Next / Submit navigation buttons.

---

## Field transform & parse

```ts
const schema: FieldDefinition[] = [
  {
    type: 'text',
    name: 'username',
    // trim on every keystroke
    transform: (value) => (typeof value === 'string' ? value.trim() : value),
  },
  {
    type: 'text',
    name: 'tags',
    defaultValue: 'vue,react',
    // split into array at submit time — values.tags is still a string
    parse: (raw) => String(raw).split(',').map((s) => s.trim()),
  },
]
```

`transform` mutates `values` immediately. `parse` runs only at submit time and does not mutate `values`.

---

## File upload field

```ts
import { fileType, fileSize, fileCount } from '@macrulez/vue-form-schema'

const schema: FieldDefinition[] = [
  {
    type: 'file',
    name: 'avatar',
    label: 'Profile photo',
    accept: 'image/*',
    validators: [
      fileType(['image/'], 'Only images are accepted'),
      fileSize(2 * 1024 * 1024, 'Max 2 MB'),
    ],
  },
  {
    type: 'file',
    name: 'attachments',
    label: 'Attachments',
    multiple: true,
    validators: [fileCount(5, 'Up to 5 files')],
  },
]
```

`values['avatar']` is `File | null`; `values['attachments']` is `File[] | null`.

`FormRenderer` automatically renders `FileField` with a drag-and-drop zone and a file list with remove buttons.

---

## Custom field components

A custom component is a pure **presentation layer** — it receives pre-computed validation state as props and signals changes back to the form. No validation logic lives inside the component itself.

### How validation flows

```
useForm
  ├─ validators / asyncValidators / required  ← defined in the schema
  ├─ errors.value['fieldName'] = ['Too short'] ← computed internally
  └─ passes to your component via props:
        error:   string[]   — list of error messages
        touched: boolean    — whether the field has been blurred
```

Your component's only job:

| What | How |
|---|---|
| Report a value change | `emit('update:modelValue', newValue)` |
| Trigger validation | `emit('blur')` — fires validation when `validateOn` is `'blur'` or `'eager'` |
| Show errors | Read `props.error` / `props.touched` (or use `useFormField`) |

### The `FormFieldProps` contract

Every component that plugs into the library must declare these props and two emits:

```ts
import type { FormFieldProps } from '@macrulez/vue-form-schema'

// props
const props = defineProps<FormFieldProps>()
// {
//   field:       FieldDefinition  — the full field config (validators, label, …)
//   modelValue:  unknown          — current value from form state
//   error:       string[]         — validation errors (empty when valid)
//   touched:     boolean          — true after first blur
// }

// emits
const emit = defineEmits<{
  'update:modelValue': [value: unknown]
  blur: []
}>()
```

### Complete example — custom phone input

```vue
<!-- MyPhoneInput.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { useFormField } from '@macrulez/vue-form-schema'
import type { FormFieldProps } from '@macrulez/vue-form-schema'

const props = defineProps<FormFieldProps>()
const emit = defineEmits<{
  'update:modelValue': [value: string]
  blur: []
}>()

const { hasError, errorMessage, isRequired } = useFormField(props)

// strip non-digits for storage, display formatted
const display = computed(() =>
  String(props.modelValue ?? '').replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3'),
)
</script>

<template>
  <div class="field">
    <label :for="field.name">
      {{ field.label }}
      <span v-if="isRequired" aria-hidden="true">*</span>
    </label>

    <input
      :id="field.name"
      type="tel"
      :value="display"
      :aria-invalid="hasError ? 'true' : 'false'"
      :aria-describedby="hasError ? `${field.name}-error` : undefined"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value.replace(/\D/g, ''))"
      @blur="emit('blur')"
    />

    <p v-if="hasError" :id="`${field.name}-error`" role="alert">
      {{ errorMessage }}
    </p>
  </div>
</template>
```

### Attach to a field via `field.component`

```ts
import MyPhoneInput from './MyPhoneInput.vue'
import { minLength, pattern } from '@macrulez/vue-form-schema'

const schema: FieldDefinition[] = [
  {
    type: 'text',
    name: 'phone',
    label: 'Phone number',
    component: MyPhoneInput,          // ← your component renders instead of TextField
    required: true,
    validators: [
      minLength(10, 'Enter a full phone number'),
      pattern(/^\d{10}$/, 'Digits only, 10 characters'),
    ],
  },
]
```

### Using without `FormRenderer` (manual wiring)

If you render fields yourself — without `FormRenderer` — wire errors and the touch handler directly:

```vue
<script setup lang="ts">
import { useForm } from '@macrulez/vue-form-schema'
import MyPhoneInput from './MyPhoneInput.vue'

const form = useForm({ schema, validateOn: 'blur' })
const touchField = (form as any).touchField   // exposed internally
</script>

<template>
  <form @submit.prevent="form.submit()">
    <MyPhoneInput
      :field="form.fields.value[0]"
      :model-value="form.values.value.phone"
      :error="form.errors.value.phone ?? []"
      :touched="form.touched.value.phone ?? false"
      @update:model-value="form.setField('phone', $event)"
      @blur="touchField('phone')"
    />
    <button type="submit">Save</button>
  </form>
</template>
```

### `useFormField` helper — computed shortcuts

```ts
import { useFormField } from '@macrulez/vue-form-schema'

const props = defineProps<FormFieldProps>()
const {
  hasError,      // ComputedRef<boolean>  — touched && error.length > 0
  errorMessage,  // ComputedRef<string | null>  — first error, or null
  allErrors,     // ComputedRef<string[]>  — all errors when touched, else []
  isRequired,    // ComputedRef<boolean>
  isDisabled,    // ComputedRef<boolean>
} = useFormField(props)
```

---

## Component registry

Replace all instances of a field type across a subtree — useful for integrating UI libraries.

### App-level (Vue plugin)

```ts
import { createApp } from 'vue'
import { createFormRegistry } from '@macrulez/vue-form-schema'
import { ElInput, ElSelect } from 'element-plus'

createApp(App)
  .use(createFormRegistry({ text: ElInput, select: ElSelect }))
  .mount('#app')
```

### Subtree-level

```ts
import { provideRegistry } from '@macrulez/vue-form-schema'

// Inside a component's setup()
provideRegistry({ checkbox: MyToggle })
```

Component priority: `field.component` > `FormRenderer :components` prop > registry > built-in defaults.

---

## Input masking

Masks format user input in real time. Applied automatically in `FormRenderer`; also usable standalone.

### Presets

| Preset | Example output |
|---|---|
| `phone-ru` | `+7 (916) 123-45-67` |
| `phone-eu` | `+49 (30) 123-45-67` |
| `date` | `01.01.2024` |
| `inn` | `123456789012` |
| `iban` | `GB29 NWBK 6016 1331 9268 19` |

```ts
{ type: 'text', name: 'phone', mask: { preset: 'phone-ru' } }
```

### Custom patterns

`#` = digit, `A` = letter (uppercased), anything else = literal.

```ts
{ type: 'text', name: 'postcode', mask: { pattern: 'AA####' } }  // AB1234
```

### Standalone API

```ts
import { applyMask, removeMask, bindMask } from '@macrulez/vue-form-schema'

applyMask('9161234567', { preset: 'phone-ru' })   // '+7 (916) 123-45-67'
removeMask('+7 (916) 123-45-67', { preset: 'phone-ru' })  // '9161234567'

const cleanup = bindMask(inputEl, { preset: 'date' })
onUnmounted(cleanup)
```

---

## Schema composition

```ts
import { mergeSchemas, omitFields, pickFields, extendField } from '@macrulez/vue-form-schema'

const base = [
  { type: 'text' as const, name: 'firstName' },
  { type: 'text' as const, name: 'lastName' },
  { type: 'email' as const, name: 'email' },
]

// Combine — later schemas win on name collision
const extended = mergeSchemas(base, [{ type: 'text' as const, name: 'phone' }])

// Remove fields
const noEmail = omitFields(base, ['email'])

// Keep only specific fields
const nameOnly = pickFields(base, ['firstName', 'lastName'])

// Non-mutating patch
const required = extendField(base, 'email', { required: true, label: 'Email address' })
```

---

## TypeScript inference

`InferValues<T>` maps a `readonly FieldDefinition[]` literal to a typed values object.

```ts
import { defineSchema } from '@macrulez/vue-form-schema'
import type { InferValues } from '@macrulez/vue-form-schema'

const schema = defineSchema([
  { type: 'text'     as const, name: 'username' as const },
  { type: 'number'   as const, name: 'age'      as const },
  { type: 'checkbox' as const, name: 'agreed'   as const },
] as const)

type Values = InferValues<typeof schema>
// { username: string; age: number; agreed: boolean }

const { values } = useForm<Values>({ schema })
// values.value.username is string ✓
```

**Type mapping:** `checkbox` → `boolean`, `number` → `number`, `array` → `unknown[]`, everything else → `string`.

---

## Persisted forms

```ts
useForm({
  schema,
  persist: 'local',       // or 'session'
  persistKey: 'checkout', // optional — defaults to a hash of field names
})
```

Values are restored from storage on `onMounted`. `reset()` clears the stored value. SSR-safe: the storage read is guarded by `typeof window !== 'undefined'`.

---

## Debug mode

```ts
// Log every values change to console.group
useForm({ schema, debug: true })
```

```ts
// Reactive snapshot of all form state
import { useFormDebug } from '@macrulez/vue-form-schema'

const { snapshot } = useFormDebug(form)
// snapshot.value = { values, errors, touched, isDirty, isValid, isSubmitting }
```

---

## FormRenderer UI component

```ts
import { FormRenderer } from '@macrulez/vue-form-schema/ui'
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
| `#field-{name}` | `{ field, value, error, touched, setValue, touch }` | Replace an entire field |
| `#label-{name}` | `{ field }` | Replace a label |
| `#error-{name}` | `{ field, error }` | Replace error display |
| `#submit` | `{ isSubmitting, isValid }` | Replace the submit button |

### Built-in field components

All exported individually from `vue-form-schema/ui`:

| Component | Field types |
|---|---|
| `TextField` | `text`, `email` |
| `NumberField` | `number` |
| `TextareaField` | `textarea` |
| `SelectField` | `select` |
| `CheckboxField` | `checkbox` |
| `RadioField` | `radio` |
| `DateField` | `date` |
| `ArrayField` | `array` |
| `FileField` | `file` |

---

## Tailwind UI theme

A drop-in replacement for `FormRenderer` using Tailwind utility classes — no custom CSS needed in your app. Requires Tailwind CSS installed and configured to scan library source files.

```ts
import { TailwindFormRenderer } from '@macrulez/vue-form-schema/ui/tailwind'
```

```vue
<!-- Same form, same schema — just swap the renderer -->
<TailwindFormRenderer :form="form" submit-label="Save" />
```

All field components are also exported individually:

```ts
import {
  TwTextField, TwSelectField, TwCheckboxField,
  TwRadioField, TwFileField, TwArrayField,
  // …
} from '@macrulez/vue-form-schema/ui/tailwind'
```

---

## Accessibility

All built-in field components include full a11y attributes:

| Feature | How |
|---|---|
| `aria-required` | Set to `"true"` on required inputs, selects, textareas, fieldsets |
| `aria-invalid` | Set to `"true"` when the field is touched and has errors |
| `aria-describedby` | Points to `"{name}-error"` when errors are present |
| `role="alert"` + `aria-live="polite"` | Error lists are announced by screen readers on appearance |
| `label[for]` + `input[id]` | All inputs have matching label and id |
| `fieldset` + `legend` | Radio groups use semantic grouping |
| `aria-checked` | Checkboxes reflect boolean state explicitly |

---

## SSR compatibility

The core (`useForm`, validators, parsers, `ConditionEvaluator`) does not use browser APIs. `bindMask` and `FormRenderer` use DOM APIs — wrap them in `onMounted` or `<ClientOnly>` when needed.

---

## Architecture

```
useForm
  │
  ├── Schema normalisation (json / zod / yup / valibot)
  │     └── FieldDefinition[]
  │
  ├── ConditionEvaluator
  │     watchEffect → resolves visible / disabled / options per field
  │
  ├── ValidationEngine
  │     sync validators   → errors Record<path, string[]>
  │     async validators  → debounced 300ms
  │
  ├── MaskEngine (standalone)
  │     applyMask / removeMask / bindMask
  │
  └── (optional) UI subpackages
        FormRenderer             [/ui]
        TailwindFormRenderer     [/ui/tailwind]
        useFieldArray            [core]
        useMultiStepForm         [core]
        useFormDebug             [core]
```

---

## Bundle size & peer dependencies

| Entry point | Peer deps | Notes |
|---|---|---|
| `vue-form-schema` | `vue ^3.3` | Core — headless, no UI |
| `vue-form-schema/zod` | `zod ^3` | Optional adapter |
| `vue-form-schema/yup` | `yup ^1` | Optional adapter |
| `vue-form-schema/valibot` | `valibot ^1` | Optional adapter |
| `vue-form-schema/ui` | `vue ^3.3` | BEM-styled built-in components |
| `vue-form-schema/ui/tailwind` | `vue ^3.3`, Tailwind CSS | Tailwind utility-class components |

All entry points are tree-shakeable ESM + CJS dual builds.

---

## License

MIT

---

## Author

Danil Lisin Vladimirovich aka Macrulez

GitHub: [macrulezru](https://github.com/macrulezru) · Website: [macrulez.ru/en](https://macrulez.ru/en)

Questions and bugs — [issues](https://github.com/macrulezru/vue-form-schema/issues)
