import { defineConfig, configDefaults } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'happy-dom',
    globals: true,
    // packages/nuxt is a separate sub-project (its own package.json, its own
    // tsconfig.json extending a `.nuxt/tsconfig.json` that only exists after
    // running its own `nuxt-module-build prepare`) — it has its own test setup,
    // see packages/nuxt/vitest.config.ts, run via `npm run test --workspace=packages/nuxt`.
    exclude: [...configDefaults.exclude, 'packages/nuxt/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      thresholds: { lines: 90, functions: 90, branches: 80, statements: 90 },
    },
  },
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
})
