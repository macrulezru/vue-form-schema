<script setup lang="ts">
import { ref, defineAsyncComponent, defineComponent, h } from 'vue'

const Loading = defineComponent({
  render: () => h('div', { style: 'color: var(--muted); padding: 40px 0;' }, 'Loading…'),
})

function asyncPage(loader: () => Promise<unknown>) {
  return defineAsyncComponent({ loader: loader as () => Promise<{ default: object }>, loadingComponent: Loading })
}

const pages = [
  { id: 'basic',      label: 'Basic form',        icon: '📝', group: 'Examples' },
  { id: 'json',       label: 'JSON schema',        icon: '🌐', group: 'Examples' },
  { id: 'zod',        label: 'Zod schema',         icon: '🔷', group: 'Examples' },
  { id: 'yup',        label: 'Yup schema',         icon: '🟡', group: 'Examples' },
  { id: 'valibot',    label: 'Valibot schema',     icon: '🔶', group: 'Examples' },
  { id: 'conditions', label: 'Conditional fields', icon: '👁️', group: 'Features' },
  { id: 'masks',      label: 'Input masking',      icon: '🎭', group: 'Features' },
  { id: 'renderer',   label: 'FormRenderer',       icon: '⚡', group: 'Features' },
  { id: 'arrays',     label: 'Array fields',       icon: '📋', group: 'Features' },
  { id: 'multistep',  label: 'Multi-step wizard',  icon: '🧭', group: 'Features' },
  { id: 'dependent',  label: 'Dependent fields',   icon: '🔗', group: 'Features' },
  { id: 'registry',   label: 'Custom registry',    icon: '🧩', group: 'Features' },
  { id: 'fileupload', label: 'File upload',         icon: '📁', group: 'Features' },
  { id: 'tailwind',   label: 'Tailwind theme',     icon: '🎨', group: 'Features' },
  { id: 'a11y',       label: 'Accessibility',      icon: '♿', group: 'Features' },
]

const groups = [...new Set(pages.map((p) => p.group))]

const active = ref('basic')

const views: Record<string, ReturnType<typeof defineAsyncComponent>> = {
  basic:      asyncPage(() => import('./examples/BasicForm.vue')),
  json:       asyncPage(() => import('./examples/JsonSchemaForm.vue')),
  zod:        asyncPage(() => import('./examples/ZodForm.vue')),
  yup:        asyncPage(() => import('./examples/YupForm.vue')),
  valibot:    asyncPage(() => import('./examples/ValibotForm.vue')),
  conditions: asyncPage(() => import('./examples/ConditionalForm.vue')),
  masks:      asyncPage(() => import('./examples/MaskedForm.vue')),
  renderer:   asyncPage(() => import('./examples/FormRendererDemo.vue')),
  arrays:     asyncPage(() => import('./examples/ArrayDemo.vue')),
  multistep:  asyncPage(() => import('./examples/MultiStepDemo.vue')),
  dependent:  asyncPage(() => import('./examples/DependentFieldsDemo.vue')),
  registry:   asyncPage(() => import('./examples/CustomRegistryDemo.vue')),
  fileupload: asyncPage(() => import('./examples/FileUploadDemo.vue')),
  tailwind:   asyncPage(() => import('./examples/TailwindDemo.vue')),
  a11y:       asyncPage(() => import('./examples/AccessibilityDemo.vue')),
}
</script>

<template>
  <div class="layout">
    <aside class="sidebar">
      <div class="sidebar-logo">
        <h1>vue-form-schema</h1>
        <p>Interactive demos</p>
      </div>

      <template v-for="group in groups" :key="group">
        <div class="nav-group-title">{{ group }}</div>
        <div
          v-for="page in pages.filter(p => p.group === group)"
          :key="page.id"
          class="nav-item"
          :class="{ active: active === page.id }"
          @click="active = page.id"
        >
          <span class="nav-icon">{{ page.icon }}</span>
          {{ page.label }}
        </div>
      </template>
    </aside>

    <main class="main">
      <component :is="views[active]" />
    </main>
  </div>
</template>
