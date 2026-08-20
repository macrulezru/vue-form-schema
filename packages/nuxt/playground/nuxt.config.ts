export default defineNuxtConfig({
  modules: ['../src/module'],
  vueFormSchema: {
    autoImports: true,
    components: true,
  },
  devtools: { enabled: true },
})
