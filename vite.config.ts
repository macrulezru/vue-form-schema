import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue(), dts({ include: ['src'], bundleTypes: true })],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        zod: resolve(__dirname, 'src/parsers/zod.ts'),
        yup: resolve(__dirname, 'src/parsers/yup.ts'),
        valibot: resolve(__dirname, 'src/parsers/valibot.ts'),
        openapi: resolve(__dirname, 'src/parsers/openapi.ts'),
        ui: resolve(__dirname, 'src/ui/index.ts'),
        'ui-tailwind': resolve(__dirname, 'src/ui/tailwind/index.ts'),
        'ui-shadcn': resolve(__dirname, 'src/ui/shadcn/index.ts'),
        'ui-primevue': resolve(__dirname, 'src/ui/primevue/index.ts'),
        'ui-naive': resolve(__dirname, 'src/ui/naive/index.ts'),
        devtools: resolve(__dirname, 'src/devtools/index.ts'),
      },
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      // PrimeVue is imported per-component (e.g. 'primevue/inputtext'), so a
      // plain specifier isn't enough — match the whole 'primevue' subpath family.
      external: ['vue', 'zod', 'yup', 'valibot', 'naive-ui', '@vue/devtools-api', /^primevue\//],
      output: {
        globals: { vue: 'Vue' },
      },
    },
  },
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
})
