import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { useForm } from '../core/useForm'
import { FormRenderer } from '../ui'
import { TailwindFormRenderer } from '../ui/tailwind'
import type { FieldDefinition } from '../core/types'

// Regression test: FormRenderer's `group` case used to recurse with the
// unscoped top-level `form`, so the recursive instance's `visibleFields`
// was still the *whole* schema (including that same group field) — every
// nested group re-rendered the entire form forever, blowing the call stack
// (confirmed via `RangeError: Maximum call stack size exceeded` before the
// fix). The fix scopes the recursive render to `field.fields` via a
// `fields` prop instead of re-deriving from `form.fields.value`.

const schema: FieldDefinition[] = [
  { type: 'text', name: 'top', label: 'Top' },
  {
    type: 'group',
    name: 'address',
    label: 'Address',
    fields: [
      { type: 'text', name: 'address.city', label: 'City', defaultValue: 'Berlin' },
      { type: 'text', name: 'address.zip', label: 'ZIP' },
    ],
  },
]

function mountRenderer(renderer: unknown) {
  return mount(
    defineComponent({
      setup() {
        const form = useForm({ schema })
        return () => h(renderer as never, { form })
      },
    }),
  )
}

describe.each([
  ['FormRenderer', FormRenderer],
  ['TailwindFormRenderer', TailwindFormRenderer],
])('%s — nested group', (_name, renderer) => {
  it('renders exactly the top-level fields and the group children once, not recursively', () => {
    const wrapper = mountRenderer(renderer)
    const inputs = wrapper.findAll('input')
    // top, address.city, address.zip — exactly 3, not an unbounded/duplicated tree
    expect(inputs.length).toBe(3)
  })

  it('shows the group child field default value on first render', () => {
    const wrapper = mountRenderer(renderer)
    const cityInput = wrapper.find('input[name="address.city"]')
    expect(cityInput.exists()).toBe(true)
    expect((cityInput.element as HTMLInputElement).value).toBe('Berlin')
  })
})
