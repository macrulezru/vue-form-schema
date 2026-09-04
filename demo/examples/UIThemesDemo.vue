<script setup lang="ts">
import { ref } from 'vue'
import { useForm } from 'vue-form-schema'
import { ShadcnFormRenderer } from 'vue-form-schema/ui/shadcn'
import { PrimeVueFormRenderer } from 'vue-form-schema/ui/primevue'
import { NaiveFormRenderer } from 'vue-form-schema/ui/naive'
import type { FieldDefinition } from 'vue-form-schema'

const schema: FieldDefinition[] = [
  { type: 'text', name: 'name', label: 'Full name', required: true, placeholder: 'Alice Smith' },
  {
    type: 'select',
    name: 'role',
    label: 'Role',
    options: [
      { label: 'Developer', value: 'dev' },
      { label: 'Designer', value: 'design' },
      { label: 'Manager', value: 'mgr' },
    ],
  },
  {
    type: 'radio',
    name: 'plan',
    label: 'Plan',
    defaultValue: 'free',
    options: [
      { label: 'Free', value: 'free' },
      { label: 'Pro', value: 'pro' },
    ],
  },
  { type: 'checkbox', name: 'newsletter', label: 'Subscribe to newsletter' },
]

function makeForm() {
  return useForm({
    schema,
    validateOn: 'blur',
    onSubmit: async () => {
      /* demo only */
    },
  })
}

const shadcnForm = makeForm()
const primevueForm = makeForm()
const naiveForm = makeForm()

const active = ref<'shadcn' | 'primevue' | 'naive'>('shadcn')
</script>

<template>
  <div>
    <div class="page-header">
      <h2>UI theme integrations</h2>
      <p>
        Three drop-in renderers for popular Vue component libraries — same schema, same
        <code>useForm</code>, just swap the renderer.
      </p>
    </div>

    <div class="tabs">
      <button :class="{ active: active === 'shadcn' }" @click="active = 'shadcn'">
        shadcn-vue style
      </button>
      <button :class="{ active: active === 'primevue' }" @click="active = 'primevue'">
        PrimeVue
      </button>
      <button :class="{ active: active === 'naive' }" @click="active = 'naive'">Naive UI</button>
    </div>

    <div v-if="active === 'shadcn'" class="card shadcn-scope">
      <div class="card-title">ui/shadcn</div>
      <p class="theme-note">
        Tailwind markup styled with shadcn/ui's own utility-class vocabulary
        (<code>border-input</code>, <code>bg-primary</code>, <code>text-destructive</code>, …). Not
        a wrapper around importable shadcn-vue components — those are copied into your project via
        its CLI, not published as an npm component library. Drop this into a project that already
        has shadcn-vue's Tailwind theme tokens set up and it matches natively.
      </p>
      <ShadcnFormRenderer :form="shadcnForm" submit-label="Submit" />
    </div>

    <div v-else-if="active === 'primevue'" class="card">
      <div class="card-title">ui/primevue</div>
      <p class="theme-note">
        Real
        <code>InputText</code
        >/<code>Select</code>/<code>RadioButton</code>/<code>Checkbox</code>/<code>Message</code>
        components from PrimeVue, wired to <code>useForm</code>.
      </p>
      <PrimeVueFormRenderer :form="primevueForm" submit-label="Submit" />
    </div>

    <div v-else class="card">
      <div class="card-title">ui/naive</div>
      <p class="theme-note">
        Real
        <code>NInput</code
        >/<code>NSelect</code>/<code>NRadioGroup</code>/<code>NCheckbox</code>/<code
          >NFormItem</code
        >
        components from Naive UI, wired to <code>useForm</code>.
      </p>
      <NaiveFormRenderer :form="naiveForm" submit-label="Submit" />
    </div>

    <div class="card">
      <div class="card-title">Usage</div>
      <pre class="code-block">
import { ShadcnFormRenderer } from 'vue-form-schema/ui/shadcn'
import { PrimeVueFormRenderer } from 'vue-form-schema/ui/primevue'
import { NaiveFormRenderer } from 'vue-form-schema/ui/naive'

// Same schema, same form composable — just swap the renderer
&lt;ShadcnFormRenderer :form="form" submit-label="Save" /&gt;
&lt;PrimeVueFormRenderer :form="form" submit-label="Save" /&gt;
&lt;NaiveFormRenderer :form="form" submit-label="Save" /&gt;</pre>
    </div>
  </div>
</template>

<style scoped>
.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}
.tabs button {
  padding: 8px 16px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  background: transparent;
  color: var(--muted);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.15s;
}
.tabs button.active {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}
.theme-note {
  font-size: 0.8rem;
  color: var(--muted);
  margin-bottom: 20px;
  line-height: 1.5;
}
.card.shadcn-scope {
  background: hsl(var(--background));
}
</style>
