/**
 * Vue DevTools integration — subentry-point 'vue-form-schema/devtools'.
 *
 * Deliberately a separate entry point (not part of the core bundle):
 * `@vue/devtools-api` is only imported here, so importing the core package
 * (or any other subentry) never pulls it in. Call `installFormDevtools`
 * once, in development only — it adds a custom inspector listing every
 * active `useForm()` instance (values/errors/touched/isValid/isDirty) and
 * a timeline layer for `setField`/`touch`/`submit`/`reset`/async-validation
 * events.
 *
 * @example
 * import { createApp } from 'vue'
 * import App from './App.vue'
 *
 * const app = createApp(App)
 * if (import.meta.env.DEV) {
 *   const { installFormDevtools } = await import('@macrulez/vue-form-schema/devtools')
 *   installFormDevtools(app)
 * }
 * app.mount('#app')
 */

import type { App } from 'vue'
import { setupDevtoolsPlugin } from '@vue/devtools-api'
import {
  getRegisteredForm,
  getRegisteredForms,
  onFormEvent,
  type FormEvent,
  type RegisteredForm,
} from '../core/formRegistry'

const INSPECTOR_ID = 'vue-form-schema-inspector'
const TIMELINE_ID = 'vue-form-schema-timeline'

const EVENT_LOG_TYPE: Record<FormEvent['type'], 'default' | 'warning' | 'error'> = {
  setField: 'default',
  touch: 'default',
  submit: 'default',
  submitSuccess: 'default',
  submitError: 'error',
  reset: 'warning',
  asyncValidate: 'default',
}

function formLabel(registered: RegisteredForm): string {
  return `${registered.label} #${registered.id}`
}

function inspectorNode(registered: RegisteredForm) {
  const hasErrors = Object.values(registered.form.errors.value).some((e) => e.length > 0)
  return {
    id: String(registered.id),
    label: formLabel(registered),
    tags: hasErrors
      ? [{ label: 'invalid', textColor: 0xffffff, backgroundColor: 0xdc2626 }]
      : registered.form.isDirty.value
        ? [{ label: 'dirty', textColor: 0x111827, backgroundColor: 0xfbbf24 }]
        : [],
  }
}

function inspectorState(registered: RegisteredForm) {
  const { values, errors, touched, isDirty, isValid, isSubmitting, optionsLoading } =
    registered.form

  return {
    summary: [
      { key: 'isValid', value: isValid.value },
      { key: 'isDirty', value: isDirty.value },
      { key: 'isSubmitting', value: isSubmitting.value },
    ],
    values: Object.entries(values.value as Record<string, unknown>).map(([key, value]) => ({
      key,
      value,
    })),
    errors: Object.entries(errors.value)
      .filter(([, messages]) => messages.length > 0)
      .map(([key, value]) => ({ key, value })),
    touched: Object.entries(touched.value)
      .filter(([, isTouched]) => isTouched)
      .map(([key, value]) => ({ key, value })),
    optionsLoading: Object.entries(optionsLoading.value)
      .filter(([, loading]) => loading)
      .map(([key, value]) => ({ key, value })),
  }
}

/** Installs the DevTools inspector + timeline for this Vue app. Safe to call multiple times or during SSR (no-ops without a browser). */
export function installFormDevtools(app: App): void {
  if (typeof window === 'undefined') return

  setupDevtoolsPlugin(
    {
      id: 'vue-form-schema',
      label: 'vue-form-schema',
      packageName: '@macrulez/vue-form-schema',
      homepage: 'https://github.com/macrulezru/vue-form-schema',
      componentStateTypes: ['vue-form-schema'],
      app,
    },
    (api) => {
      api.addInspector({
        id: INSPECTOR_ID,
        label: 'Forms',
        icon: 'dynamic_form',
        treeFilterPlaceholder: 'Search active forms',
        nodeActions: [
          {
            icon: 'content_copy',
            tooltip: 'Log snapshot to console',
            action: (nodeId: string) => {
              const registered = getRegisteredForm(Number(nodeId))
              if (registered) {
                console.log(
                  `[vue-form-schema] ${formLabel(registered)}`,
                  inspectorState(registered),
                )
              }
            },
          },
        ],
      })

      api.addTimelineLayer({ id: TIMELINE_ID, label: 'Forms', color: 0x2563eb })

      api.on.getInspectorTree((payload) => {
        if (payload.inspectorId !== INSPECTOR_ID) return
        payload.rootNodes = getRegisteredForms().map(inspectorNode)
      })

      api.on.getInspectorState((payload) => {
        if (payload.inspectorId !== INSPECTOR_ID) return
        const registered = getRegisteredForm(Number(payload.nodeId))
        if (registered) payload.state = inspectorState(registered)
      })

      onFormEvent((event) => {
        const registered = getRegisteredForm(event.formId)
        api.addTimelineEvent({
          layerId: TIMELINE_ID,
          event: {
            time: event.time,
            title: event.type,
            subtitle: registered ? formLabel(registered) : `#${event.formId}`,
            data: event.payload ?? {},
            logType: EVENT_LOG_TYPE[event.type],
          },
        })
        api.sendInspectorTree(INSPECTOR_ID)
        api.sendInspectorState(INSPECTOR_ID)
      })
    },
  )
}
