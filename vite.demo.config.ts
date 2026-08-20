import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  css: {
    postcss: {
      plugins: [tailwindcss({ config: resolve(__dirname, 'tailwind.config.js') }), autoprefixer()],
    },
  },
  root: 'demo',
  resolve: {
    alias: {
      'vue-form-schema/zod': resolve(__dirname, 'src/parsers/zod.ts'),
      'vue-form-schema/yup': resolve(__dirname, 'src/parsers/yup.ts'),
      'vue-form-schema/valibot': resolve(__dirname, 'src/parsers/valibot.ts'),
      'vue-form-schema/openapi': resolve(__dirname, 'src/parsers/openapi.ts'),
      'vue-form-schema/devtools': resolve(__dirname, 'src/devtools/index.ts'),
      'vue-form-schema/ui/tailwind': resolve(__dirname, 'src/ui/tailwind/index.ts'),
      'vue-form-schema/ui/shadcn': resolve(__dirname, 'src/ui/shadcn/index.ts'),
      'vue-form-schema/ui/primevue': resolve(__dirname, 'src/ui/primevue/index.ts'),
      'vue-form-schema/ui/naive': resolve(__dirname, 'src/ui/naive/index.ts'),
      'vue-form-schema/ui': resolve(__dirname, 'src/ui/index.ts'),
      'vue-form-schema': resolve(__dirname, 'src/index.ts'),
    },
  },
  server: {
    port: 5174,
    open: true,
  },
})
