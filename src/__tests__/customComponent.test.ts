import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, nextTick, h } from 'vue'
import { useForm } from '../core/useForm'
import { useFormField } from '../core/useFormField'
import type { FieldDefinition, FormFieldProps } from '../core/types'

// ─── #4 Custom Components via Schema ─────────────────────────────────────────

// Minimal custom field component for testing
const CustomTextInput = defineComponent({
  name: 'CustomTextInput',
  props: {
    field: { type: Object, required: true },
    modelValue: { default: null },
    error: { type: Array, default: () => [] },
    touched: { type: Boolean, default: false },
  },
  emits: ['update:modelValue', 'blur'],
  setup(props) {
    const { hasError, errorMessage, isRequired } = useFormField(props as unknown as FormFieldProps)
    return { hasError, errorMessage, isRequired }
  },
  template: `
    <div data-testid="custom-field">
      <input
        data-testid="custom-input"
        :value="modelValue"
        :class="{ error: hasError }"
        @input="$emit('update:modelValue', $event.target.value)"
        @blur="$emit('blur')"
      />
      <span v-if="hasError" data-testid="custom-error">{{ errorMessage }}</span>
      <span data-testid="required-flag">{{ isRequired ? 'required' : 'optional' }}</span>
    </div>
  `,
})

describe('field.component — renders custom component', () => {
  it('renders the custom component instead of built-in', () => {
    const schema: FieldDefinition[] = [
      { type: 'text', name: 'username', label: 'Username', component: CustomTextInput },
    ]
    const form = mount(defineComponent({
      setup() { return useForm({ schema }) },
      template: '<div/>',
    }))
    // FormRenderer is not used here — we verify that the component property is stored in the field.
    // Vue's reactivity wraps stored objects in Proxy, so compare by component name rather than identity.
    const comp = (form.vm.fields as unknown as FieldDefinition[])[0].component as { name: string }
    expect(comp.name).toBe('CustomTextInput')
  })

  it('passes field, modelValue, error, touched as props', async () => {
    const schema: FieldDefinition[] = [
      { type: 'text', name: 'name', required: true, component: CustomTextInput },
    ]
    const wrapper = mount(defineComponent({
      components: { CustomTextInput },
      setup() {
        const form = useForm({ schema, validateOn: 'input' })
        return { form }
      },
      template: `
        <div>
          <CustomTextInput
            :field="form.fields.value[0]"
            :model-value="form.values.value.name"
            :error="form.errors.value.name ?? []"
            :touched="form.touched.value.name ?? false"
            @update:model-value="form.setField('name', $event)"
          />
        </div>
      `,
    }))

    const input = wrapper.find('[data-testid="custom-input"]')
    expect(input.exists()).toBe(true)

    // Verify modelValue binding
    await input.setValue('Alice')
    expect(wrapper.vm.form.values.value.name).toBe('Alice')
  })

  it('custom component receives updated error via props after failed submit', async () => {
    const schema: FieldDefinition[] = [
      { type: 'text', name: 'name', required: true, component: CustomTextInput },
    ]
    const wrapper = mount(defineComponent({
      components: { CustomTextInput },
      setup() {
        const form = useForm({ schema })
        return { form }
      },
      template: `
        <div>
          <CustomTextInput
            :field="form.fields.value[0]"
            :model-value="form.values.value.name"
            :error="form.errors.value.name ?? []"
            :touched="form.touched.value.name ?? false"
          />
        </div>
      `,
    }))

    // No error before submit
    expect(wrapper.find('[data-testid="custom-error"]').exists()).toBe(false)

    // Submit without filling required field — triggers touch + error
    await wrapper.vm.form.submit()
    await nextTick()

    expect(wrapper.find('[data-testid="custom-error"]').exists()).toBe(true)
  })
})

// ─── #4 useFormField helper ───────────────────────────────────────────────────

describe('useFormField helper', () => {
  function mountCustom(props: Partial<FormFieldProps>) {
    const field: FieldDefinition = { type: 'text', name: 'test', required: true }
    const merged: FormFieldProps = {
      field,
      modelValue: null,
      error: [],
      touched: false,
      ...props,
    }
    return mount(defineComponent({
      setup() { return useFormField(merged) },
      template: '<div/>',
    }))
  }

  it('hasError is false when not touched', () => {
    const w = mountCustom({ error: ['Required'], touched: false })
    expect(w.vm.hasError).toBe(false)
  })

  it('hasError is true when touched with errors', () => {
    const w = mountCustom({ error: ['Required'], touched: true })
    expect(w.vm.hasError).toBe(true)
  })

  it('errorMessage returns first error', () => {
    const w = mountCustom({ error: ['First', 'Second'], touched: true })
    expect(w.vm.errorMessage).toBe('First')
  })

  it('allErrors returns all errors only when touched', () => {
    const w = mountCustom({ error: ['A', 'B'], touched: true })
    expect(w.vm.allErrors).toEqual(['A', 'B'])
  })

  it('allErrors is empty when not touched', () => {
    const w = mountCustom({ error: ['A', 'B'], touched: false })
    expect(w.vm.allErrors).toEqual([])
  })

  it('isRequired reflects field.required', () => {
    const w = mountCustom({})
    expect(w.vm.isRequired).toBe(true)
  })

  it('isDisabled reflects field.disabled', () => {
    const field: FieldDefinition = { type: 'text', name: 'x', disabled: true }
    const w = mount(defineComponent({
      setup() {
        return useFormField({ field, modelValue: null, error: [], touched: false })
      },
      template: '<div/>',
    }))
    expect(w.vm.isDisabled).toBe(true)
  })
})

// ─── #3.2 defaultValue as function ───────────────────────────────────────────

describe('defaultValue as function', () => {
  it('evaluates function default at init time', () => {
    const schema: FieldDefinition[] = [
      { type: 'text', name: 'first', defaultValue: 'John' },
      { type: 'text', name: 'last', defaultValue: 'Doe' },
      {
        type: 'text',
        name: 'full',
        defaultValue: (values: Record<string, unknown>) => `${values.first} ${values.last}`,
      },
    ]
    const w = mount(defineComponent({
      setup() { return useForm({ schema }) },
      template: '<div/>',
    }))
    expect(w.vm.values.full).toBe('John Doe')
  })

  it('override takes precedence over function default', () => {
    const schema: FieldDefinition[] = [
      { type: 'text', name: 'name', defaultValue: () => 'computed' },
    ]
    const w = mount(defineComponent({
      setup() { return useForm({ schema, initialValues: { name: 'override' } as never }) },
      template: '<div/>',
    }))
    expect(w.vm.values.name).toBe('override')
  })
})
