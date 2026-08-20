import { createApp } from 'vue'
import PrimeVue from 'primevue/config'
import Aura from '@primeuix/themes/aura'
import App from './App.vue'
import './style.css'
import './tailwind.css'

const app = createApp(App).use(PrimeVue, {
  theme: { preset: Aura, options: { darkModeSelector: false } },
})

// Dev-only, and dynamically imported so vue-form-schema/devtools (and its
// @vue/devtools-api dependency) never end up in a production bundle.
if (import.meta.env.DEV) {
  import('vue-form-schema/devtools').then(({ installFormDevtools }) => {
    installFormDevtools(app)
  })
}

app.mount('#app')
