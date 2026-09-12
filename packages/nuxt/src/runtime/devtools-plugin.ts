import { defineNuxtPlugin } from '#app'
import { installFormDevtools } from '@macrulez/vue-form-schema/devtools'

// Dev-only by construction: the module only ever registers this plugin when
// nuxt.options.dev is true (see ../module.ts) — installFormDevtools itself
// only additionally guards against a missing `window` (SSR), not against
// production, since sibling packages in this ecosystem leave that call-site
// decision to the plugin/module wiring rather than baking it into the
// devtools entry point itself.
export default defineNuxtPlugin((nuxtApp) => {
  installFormDevtools(nuxtApp.vueApp)
})
