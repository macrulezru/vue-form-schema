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
      'vue-form-schema/ui/tailwind': resolve(__dirname, 'src/ui/tailwind/index.ts'),
      'vue-form-schema/ui':  resolve(__dirname, 'src/ui/index.ts'),
      'vue-form-schema':     resolve(__dirname, 'src/index.ts'),
    },
  },
  server: {
    port: 5174,
    open: true,
  },
})
