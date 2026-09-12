import { describe, expect, it, vi } from 'vitest'
import type { Nuxt } from '@nuxt/schema'

const addComponent = vi.fn()
const addImports = vi.fn()
const addPlugin = vi.fn()

vi.mock('@nuxt/kit', async () => {
  const actual = await vi.importActual<typeof import('@nuxt/kit')>('@nuxt/kit')
  return {
    ...actual,
    defineNuxtModule: (config: unknown) => config,
    addComponent,
    addImports,
    addPlugin,
    createResolver: () => ({ resolve: (p: string) => p }),
  }
})

const mod = (await import('../module')).default as unknown as {
  meta: { name: string; configKey: string }
  setup: (
    options: { autoImports: boolean; components: boolean; devtools: boolean },
    nuxt: Nuxt,
  ) => void
}

function makeNuxt(dev: boolean) {
  const nuxt = { hook: vi.fn(), options: { dev } }
  return nuxt as unknown as Nuxt
}

describe('@macrulez/nuxt-vue-form-schema module', () => {
  it('exposes the expected module meta', () => {
    expect(mod.meta).toMatchObject({
      name: '@macrulez/nuxt-vue-form-schema',
      configKey: 'vueFormSchema',
    })
  })

  it('registers the devtools plugin in dev mode by default', () => {
    // Regression: installFormDevtools() had to be called manually, unlike
    // sibling packages in this ecosystem that wire DevTools automatically via
    // their plugin/Nuxt module.
    addPlugin.mockClear()
    mod.setup({ autoImports: true, components: false, devtools: true }, makeNuxt(true))
    expect(addPlugin).toHaveBeenCalledTimes(1)
  })

  it('never registers the devtools plugin outside dev, even with devtools: true', () => {
    addPlugin.mockClear()
    mod.setup({ autoImports: true, components: false, devtools: true }, makeNuxt(false))
    expect(addPlugin).not.toHaveBeenCalled()
  })

  it('skips the devtools plugin when devtools: false, even in dev', () => {
    addPlugin.mockClear()
    mod.setup({ autoImports: true, components: false, devtools: false }, makeNuxt(true))
    expect(addPlugin).not.toHaveBeenCalled()
  })
})
