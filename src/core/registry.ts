import { inject, provide, type App, type Component } from 'vue'
import type { FieldType } from './types'

export type ComponentMap = Partial<Record<FieldType, Component | string>>

const REGISTRY_KEY = Symbol('vfs:registry')

/**
 * Install a global default component map for all FormRenderer instances.
 *
 * Usage (main.ts):
 *   app.use(createFormRegistry({ text: MyTextInput, select: MySelect }))
 */
export function createFormRegistry(components: ComponentMap) {
  return {
    install(app: App) {
      app.provide(REGISTRY_KEY, components)
    },
  }
}

/** Called inside FormRenderer to read the app-level registry */
export function useRegistry(): ComponentMap {
  return inject<ComponentMap>(REGISTRY_KEY, {})
}

/** Called inside a component subtree to provide a local registry override */
export function provideRegistry(components: ComponentMap) {
  provide(REGISTRY_KEY, components)
}
