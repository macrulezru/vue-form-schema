import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    vue(),
    dts({ include: ['src'], rollupTypes: true }),
  ],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        zod: resolve(__dirname, 'src/parsers/zod.ts'),
        yup: resolve(__dirname, 'src/parsers/yup.ts'),
        valibot: resolve(__dirname, 'src/parsers/valibot.ts'),
        ui: resolve(__dirname, 'src/ui/index.ts'),
        'ui-tailwind': resolve(__dirname, 'src/ui/tailwind/index.ts'),
      },
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: ['vue', 'zod', 'yup', 'valibot'],
      output: {
        globals: { vue: 'Vue' },
      },
    },
  },
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
})
