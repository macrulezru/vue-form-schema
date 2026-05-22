import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  root: 'demo',
  resolve: {
    alias: {
      'vue-form-schema/zod': resolve(__dirname, 'src/parsers/zod.ts'),
      'vue-form-schema/yup': resolve(__dirname, 'src/parsers/yup.ts'),
      'vue-form-schema/ui':  resolve(__dirname, 'src/ui/index.ts'),
      'vue-form-schema':     resolve(__dirname, 'src/index.ts'),
    },
  },
  server: {
    port: 5174,
    open: true,
  },
})
