import { addComponent, addImports, addPlugin, createResolver, defineNuxtModule } from '@nuxt/kit'

export interface ModuleOptions {
  /**
   * Auto-import composables and helper functions (`useForm`, `useFieldArray`,
   * `parseZod`, `mergeSchemas`, built-in validators, ...) so they're
   * available in components/composables without an explicit `import`.
   * @default true
   */
  autoImports?: boolean
  /**
   * Also register the headless UI components (`FormRenderer`,
   * `MultiStepFormRenderer`) as global components, prefixed `Vfs*`
   * (`VfsFormRenderer`, `VfsMultiStepFormRenderer`) to avoid name clashes.
   * Off by default — most consumers render fields themselves or opt in
   * explicitly.
   * @default false
   */
  components?: boolean
  /**
   * Auto-install the Vue DevTools inspector/timeline (`installFormDevtools`)
   * during `nuxt dev`, instead of requiring a manual call — unlike the base
   * package (no single `app.use()` entry point to hook), this module already
   * owns Nuxt's plugin registration, which is the natural place for it.
   * Never registered outside `nuxt dev` regardless of this setting.
   * @default true
   */
  devtools?: boolean
}

declare module '@nuxt/schema' {
  interface NuxtConfig {
    vueFormSchema?: ModuleOptions
  }
  interface NuxtOptions {
    vueFormSchema: ModuleOptions
  }
}

const CORE_MODULE = '@macrulez/vue-form-schema'

// Composables, validators and schema-composition helpers re-exported for
// auto-import. Kept to the "you call this directly in a component" surface —
// lower-level building blocks (ValidationEngine, ConditionEvaluator, path
// helpers) are left to explicit imports.
const AUTO_IMPORT_NAMES = [
  'useForm',
  'useFieldArray',
  'useMultiStepForm',
  'useFormDebug',
  'useFormField',
  'defineSchema',
  'createFormRegistry',
  'provideRegistry',
  'mergeSchemas',
  'omitFields',
  'pickFields',
  'extendField',
  'applyMask',
  'removeMask',
  'bindMask',
  'parseJSON',
  'required',
  'minLength',
  'maxLength',
  'min',
  'max',
  'pattern',
  'email',
  'url',
  'sameAs',
  'fileType',
  'fileSize',
  'fileCount',
] as const

// Optional schema adapters — safe to auto-import unconditionally: Nuxt's
// auto-import only injects the `import` statement for names actually used
// in a given file, so projects that don't have zod/yup/valibot installed
// are unaffected unless they call one of these.
const ADAPTER_IMPORTS = [
  { name: 'parseZod', from: `${CORE_MODULE}/zod` },
  { name: 'parseYup', from: `${CORE_MODULE}/yup` },
  { name: 'parseValibot', from: `${CORE_MODULE}/valibot` },
] as const

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: '@macrulez/nuxt-vue-form-schema',
    configKey: 'vueFormSchema',
    compatibility: { nuxt: '^3.0.0 || ^4.0.0' },
  },
  defaults: {
    autoImports: true,
    components: false,
    devtools: true,
  },
  setup(options, nuxt) {
    nuxt.hook('prepare:types', ({ references }) => {
      references.push({ types: '@macrulez/nuxt-vue-form-schema' })
    })

    if (options.autoImports) {
      for (const name of AUTO_IMPORT_NAMES) {
        addImports({ name, from: CORE_MODULE })
      }
      for (const { name, from } of ADAPTER_IMPORTS) {
        addImports({ name, from })
      }
    }

    if (options.components) {
      addComponent({
        name: 'VfsFormRenderer',
        export: 'FormRenderer',
        filePath: `${CORE_MODULE}/ui`,
      })
      addComponent({
        name: 'VfsMultiStepFormRenderer',
        export: 'MultiStepFormRenderer',
        filePath: `${CORE_MODULE}/ui`,
      })
    }

    if (options.devtools && nuxt.options.dev) {
      const resolver = createResolver(import.meta.url)
      addPlugin(resolver.resolve('./runtime/devtools-plugin'))
    }
  },
})
