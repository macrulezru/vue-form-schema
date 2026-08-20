import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, nextTick } from 'vue'
import { useForm } from '../core/useForm'
import { applyServerErrors, normalizeServerErrors } from '../core/serverErrors'
import type { FieldDefinition } from '../core/types'

// `form` is returned nested (not spread) so its Refs stay real Refs on
// wrapper.vm.form — needed since applyServerErrors takes the actual
// UseFormReturn object (with `.errors`/`.touched` as writable Refs), not
// the auto-unwrapped values Vue Test Utils exposes for top-level setup()
// return properties.
function mountForm(schema: FieldDefinition[], config: Partial<Parameters<typeof useForm>[0]> = {}) {
  return mount(
    defineComponent({
      setup() {
        const form = useForm({ schema, ...config })
        return { form }
      },
      template: '<div></div>',
    }),
  )
}

const schema: FieldDefinition[] = [
  { type: 'text', name: 'name', required: true },
  { type: 'email', name: 'email', required: true },
]

describe('normalizeServerErrors — laravel', () => {
  it('reads the "errors" object, dot-paths and all', () => {
    const result = normalizeServerErrors(
      {
        message: 'The given data was invalid.',
        errors: {
          email: ['The email field is required.', 'The email must be a valid email address.'],
          'address.city': ['The address.city field is required.'],
        },
      },
      'laravel',
    )
    expect(result.fieldErrors.email).toHaveLength(2)
    expect(result.fieldErrors['address.city']).toEqual(['The address.city field is required.'])
    expect(result.formErrors).toEqual([])
  })
})

describe('normalizeServerErrors — drf', () => {
  it('reads flat field errors', () => {
    const result = normalizeServerErrors({ email: ['This field is required.'] }, 'drf')
    expect(result.fieldErrors.email).toEqual(['This field is required.'])
  })

  it('flattens nested serializer errors into dot-paths', () => {
    const result = normalizeServerErrors({ address: { city: ['This field is required.'] } }, 'drf')
    expect(result.fieldErrors['address.city']).toEqual(['This field is required.'])
  })

  it('treats non_field_errors and detail as form-level, not field errors', () => {
    const result = normalizeServerErrors(
      { non_field_errors: ['Passwords do not match.'], detail: ['Not found.'] },
      'drf',
    )
    expect(result.fieldErrors).toEqual({})
    expect(result.formErrors).toEqual(['Passwords do not match.', 'Not found.'])
  })
})

describe('normalizeServerErrors — flat', () => {
  it('accepts a single string message per field', () => {
    const result = normalizeServerErrors({ email: 'Email is taken' }, 'flat')
    expect(result.fieldErrors.email).toEqual(['Email is taken'])
  })

  it('accepts an array of messages per field', () => {
    const result = normalizeServerErrors({ email: ['Taken', 'Also invalid'] }, 'flat')
    expect(result.fieldErrors.email).toEqual(['Taken', 'Also invalid'])
  })

  it('is the default format', () => {
    const result = normalizeServerErrors({ email: 'Taken' })
    expect(result.fieldErrors.email).toEqual(['Taken'])
  })
})

describe('normalizeServerErrors — custom mapper function', () => {
  it('delegates to the provided function', () => {
    const result = normalizeServerErrors({ weird: 'shape' }, (raw) => ({
      fieldErrors: { email: [`custom: ${(raw as { weird: string }).weird}`] },
      formErrors: [],
    }))
    expect(result.fieldErrors.email).toEqual(['custom: shape'])
  })
})

describe('applyServerErrors', () => {
  it('sets errors.value and returns the normalized result', () => {
    const wrapper = mountForm(schema)
    const result = applyServerErrors(wrapper.vm.form, { email: 'Email is already taken' })
    expect(wrapper.vm.form.errors.value.email).toEqual(['Email is already taken'])
    expect(result.fieldErrors.email).toEqual(['Email is already taken'])
  })

  it('touches affected fields by default so errors are visible without a blur', () => {
    const wrapper = mountForm(schema)
    expect(wrapper.vm.form.touched.value.email).toBeFalsy()
    applyServerErrors(wrapper.vm.form, { email: 'Taken' })
    expect(wrapper.vm.form.touched.value.email).toBe(true)
  })

  it('does not touch fields when touch: false', () => {
    const wrapper = mountForm(schema)
    applyServerErrors(wrapper.vm.form, { email: 'Taken' }, { touch: false })
    expect(wrapper.vm.form.touched.value.email).toBeFalsy()
  })

  it('merges with existing errors by default, keeping other fields untouched', async () => {
    const wrapper = mountForm(schema, { validateOn: 'submit' })
    // seed a client-side error on 'name' first
    wrapper.vm.form.errors.value = { name: ['Client error'] }
    await nextTick()
    applyServerErrors(wrapper.vm.form, { email: 'Taken' })
    expect(wrapper.vm.form.errors.value.name).toEqual(['Client error'])
    expect(wrapper.vm.form.errors.value.email).toEqual(['Taken'])
  })

  it('replaces errors.value wholesale when merge: false', async () => {
    const wrapper = mountForm(schema, { validateOn: 'submit' })
    wrapper.vm.form.errors.value = { name: ['Client error'] }
    await nextTick()
    applyServerErrors(wrapper.vm.form, { email: 'Taken' }, { merge: false })
    expect(wrapper.vm.form.errors.value.name).toBeUndefined()
    expect(wrapper.vm.form.errors.value.email).toEqual(['Taken'])
  })

  it('drives form.isValid to false while the server error is present', () => {
    const wrapper = mountForm(schema, {
      initialValues: { name: 'Alice', email: 'a@b.com' } as never,
    })
    expect(wrapper.vm.form.isValid.value).toBe(true)
    applyServerErrors(wrapper.vm.form, { email: 'Already taken' })
    expect(wrapper.vm.form.isValid.value).toBe(false)
  })

  it('a server error on a field is naturally replaced once that field revalidates client-side', async () => {
    // validateOn: 'input' — every setField triggers a fresh sync-only revalidation for that field
    const wrapper = mountForm(schema, {
      validateOn: 'input',
      initialValues: { name: 'Alice', email: 'a@b.com' } as never,
    })
    applyServerErrors(wrapper.vm.form, { email: 'Email is already taken' })
    expect(wrapper.vm.form.errors.value.email).toEqual(['Email is already taken'])

    // user edits the field again — client-side sync validators (which don't
    // know about "already taken") recompute and naturally replace it
    wrapper.vm.form.setField('email', 'new@example.com')
    await nextTick()
    expect(wrapper.vm.form.errors.value.email).toEqual([])
  })
})
