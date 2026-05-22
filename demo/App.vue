<script setup lang="ts">
import { ref, defineAsyncComponent } from 'vue'

const pages = [
  { id: 'basic',      label: 'Basic form',      icon: '📝', group: 'Examples' },
  { id: 'json',       label: 'JSON schema',      icon: '🌐', group: 'Examples' },
  { id: 'zod',        label: 'Zod schema',       icon: '🔷', group: 'Examples' },
  { id: 'yup',        label: 'Yup schema',       icon: '🟡', group: 'Examples' },
  { id: 'conditions', label: 'Conditional fields', icon: '👁️', group: 'Features' },
  { id: 'masks',      label: 'Input masking',    icon: '🎭', group: 'Features' },
  { id: 'renderer',   label: 'FormRenderer',     icon: '⚡', group: 'Features' },
]

const groups = [...new Set(pages.map((p) => p.group))]

const active = ref('basic')

const views: Record<string, ReturnType<typeof defineAsyncComponent>> = {
  basic:      defineAsyncComponent(() => import('./examples/BasicForm.vue')),
  json:       defineAsyncComponent(() => import('./examples/JsonSchemaForm.vue')),
  zod:        defineAsyncComponent(() => import('./examples/ZodForm.vue')),
  yup:        defineAsyncComponent(() => import('./examples/YupForm.vue')),
  conditions: defineAsyncComponent(() => import('./examples/ConditionalForm.vue')),
  masks:      defineAsyncComponent(() => import('./examples/MaskedForm.vue')),
  renderer:   defineAsyncComponent(() => import('./examples/FormRendererDemo.vue')),
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
      <Suspense>
        <component :is="views[active]" />
        <template #fallback>
          <div style="color: var(--muted); padding: 40px 0;">Loading…</div>
        </template>
      </Suspense>
    </main>
  </div>
</template>
