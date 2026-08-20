import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { z } from 'zod'
import { object, string, number, boolean } from 'yup'
import * as v from 'valibot'
import { parseZod } from '../parsers/zod'
import { parseYup } from '../parsers/yup'
import { parseValibot } from '../parsers/valibot'
import { parseJSONSchema } from '../parsers/openapi'
import { useForm } from '../core/useForm'
import type { TypedFieldDefinitions, UseFormConfig } from '../core/types'

// These tests double as compile-time checks: `npm run typecheck` type-checks
// this file, so the `@ts-expect-error` lines below only pass if the schema
// adapters actually carry their inferred value type through to `useForm` —
// a regression here would show up as a typecheck failure, not just a runtime one.
//
// Note: this helper is intentionally generic over T (mirroring useForm's
// "typed schema" overload) rather than typed via `Parameters<typeof useForm>`
// — `Parameters<T>` on an overloaded function collapses to its *last*
// signature, which would silently discard the inference we're testing here.
function mountForm<T extends Record<string, unknown>>(
  config: Omit<UseFormConfig<T>, 'schema'> & { schema: TypedFieldDefinitions<T> },
) {
  return mount(
    defineComponent({
      setup() {
        return useForm(config)
      },
      template: '<div></div>',
    }),
  )
}

describe('type inference — parseZod', () => {
  it('infers values type from the schema without an explicit useForm<T>', () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
      agreed: z.boolean(),
    })
    const fields = parseZod(schema)

    const wrapper = mountForm({
      schema: fields,
      initialValues: { name: 'Alice', age: 30, agreed: true },
      onSubmit: (data) => {
        const name: string = data.name
        const age: number = data.age
        const agreed: boolean = data.agreed
        // @ts-expect-error — 'email' does not exist on the inferred zod type
        const bad = data.email
        void name
        void age
        void agreed
        void bad
      },
    })

    expect(wrapper.vm.values.name).toBe('Alice')
    expect(wrapper.vm.values.age).toBe(30)
  })
})

describe('type inference — parseYup', () => {
  it('infers values type from the schema without an explicit useForm<T>', () => {
    const schema = object({
      name: string().required(),
      age: number().required(),
      agreed: boolean().required(),
    })
    const fields = parseYup(schema)

    const wrapper = mountForm({
      schema: fields,
      initialValues: { name: 'Bob', age: 25, agreed: false },
      onSubmit: (data) => {
        const name: string = data.name
        const age: number = data.age
        // @ts-expect-error — 'email' does not exist on the inferred yup type
        const bad = data.email
        void name
        void age
        void bad
      },
    })

    expect(wrapper.vm.values.name).toBe('Bob')
  })
})

describe('type inference — parseValibot', () => {
  it('infers values type from the schema without an explicit useForm<T>', () => {
    const schema = v.object({
      name: v.string(),
      age: v.number(),
      agreed: v.boolean(),
    })
    const fields = parseValibot(schema)

    const wrapper = mountForm({
      schema: fields,
      initialValues: { name: 'Carol', age: 40, agreed: true },
      onSubmit: (data) => {
        const name: string = data.name
        const age: number = data.age
        // @ts-expect-error — 'email' does not exist on the inferred valibot type
        const bad = data.email
        void name
        void age
        void bad
      },
    })

    expect(wrapper.vm.values.name).toBe('Carol')
  })
})

describe('type inference — parseJSONSchema', () => {
  it('infers values type from the schema without an explicit useForm<T>', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
        agreed: { type: 'boolean' },
      },
      required: ['name', 'age', 'agreed'],
    } as const
    const fields = parseJSONSchema(schema)

    const wrapper = mountForm({
      schema: fields,
      initialValues: { name: 'Dave', age: 50, agreed: true },
      onSubmit: (data) => {
        const name: string = data.name
        const age: number = data.age
        const agreed: boolean = data.agreed
        // @ts-expect-error — 'email' does not exist on the inferred JSON Schema type
        const bad = data.email
        void name
        void age
        void agreed
        void bad
      },
    })

    expect(wrapper.vm.values.name).toBe('Dave')
  })

  it('infers enum properties as a literal union', () => {
    const schema = {
      type: 'object',
      properties: { role: { type: 'string', enum: ['admin', 'user'] } },
      required: ['role'],
    } as const
    const fields = parseJSONSchema(schema)

    mountForm({
      schema: fields,
      initialValues: { role: 'admin' },
      onSubmit: (data) => {
        const role: 'admin' | 'user' = data.role
        // @ts-expect-error — 'moderator' is not part of the enum
        const bad: 'admin' | 'user' = 'moderator'
        void role
        void bad
      },
    })
  })

  it('marks properties absent from "required" as optional', () => {
    const schema = {
      type: 'object',
      properties: { name: { type: 'string' }, nickname: { type: 'string' } },
      required: ['name'],
    } as const
    const fields = parseJSONSchema(schema)

    mountForm({
      schema: fields,
      onSubmit: (data) => {
        // optional properties may be omitted from initialValues without a type error
        const nickname: string | undefined = data.nickname
        void nickname
      },
    })
  })
})
