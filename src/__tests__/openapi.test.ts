import { describe, it, expect } from 'vitest'
import { parseJSONSchema, parseOpenAPI } from '../parsers/openapi'
import type { JSONSchemaDocument } from '../parsers/openapi'

describe('parseJSONSchema — basic type mapping', () => {
  const schema = {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 2, maxLength: 20 },
      age: { type: 'integer', minimum: 0, maximum: 130 },
      email: { type: 'string', format: 'email' },
      website: { type: 'string', format: 'uri' },
      birthDate: { type: 'string', format: 'date' },
      agreed: { type: 'boolean' },
      role: { type: 'string', enum: ['admin', 'user'] },
    },
    required: ['name', 'email'],
  } as const

  const fields = parseJSONSchema(schema)

  it('maps string/integer/boolean to text/number/checkbox', () => {
    expect(fields.find((f) => f.name === 'name')?.type).toBe('text')
    expect(fields.find((f) => f.name === 'age')?.type).toBe('number')
    expect(fields.find((f) => f.name === 'agreed')?.type).toBe('checkbox')
  })

  it('maps format: email/uri/date', () => {
    expect(fields.find((f) => f.name === 'email')?.type).toBe('email')
    expect(fields.find((f) => f.name === 'birthDate')?.type).toBe('date')
    // 'website' stays text (format: uri isn't a field type) but gets the url validator
    expect(fields.find((f) => f.name === 'website')?.type).toBe('text')
  })

  it('maps enum to select with options', () => {
    const role = fields.find((f) => f.name === 'role')
    expect(role?.type).toBe('select')
    expect(role?.options).toEqual([
      { label: 'admin', value: 'admin' },
      { label: 'user', value: 'user' },
    ])
  })

  it('sets required only for fields listed in the schema\'s "required" array', () => {
    expect(fields.find((f) => f.name === 'name')?.required).toBe(true)
    expect(fields.find((f) => f.name === 'email')?.required).toBe(true)
    expect(fields.find((f) => f.name === 'age')?.required).toBe(false)
  })

  it('minLength/maxLength/minimum/maximum/uri produce working validators', () => {
    const name = fields.find((f) => f.name === 'name')!
    expect(name.validators!.some((v) => v('a', {}) !== null)).toBe(true) // too short
    expect(name.validators!.some((v) => v('ok', {}) !== null)).toBe(false)

    const age = fields.find((f) => f.name === 'age')!
    expect(age.validators!.some((v) => v(-1, {}) !== null)).toBe(true)
    expect(age.validators!.some((v) => v(200, {}) !== null)).toBe(true)
    expect(age.validators!.some((v) => v(30, {}) !== null)).toBe(false)

    const website = fields.find((f) => f.name === 'website')!
    expect(website.validators!.some((v) => v('not-a-url', {}) !== null)).toBe(true)
    expect(website.validators!.some((v) => v('https://example.com', {}) !== null)).toBe(false)
  })
})

describe('parseJSONSchema — pattern validator', () => {
  it('maps pattern to the regex validator', () => {
    const fields = parseJSONSchema({
      type: 'object',
      properties: { zip: { type: 'string', pattern: '^\\d{5}$' } },
    } as const)
    const zip = fields[0]
    expect(zip.validators!.some((v) => v('1234', {}) !== null)).toBe(true)
    expect(zip.validators!.some((v) => v('12345', {}) !== null)).toBe(false)
  })
})

describe('parseJSONSchema — nested object (group)', () => {
  it('prefixes nested group field names with the parent name', () => {
    const fields = parseJSONSchema({
      type: 'object',
      properties: {
        address: {
          type: 'object',
          properties: { city: { type: 'string' }, zip: { type: 'string' } },
          required: ['city'],
        },
      },
    } as const)

    const address = fields[0]
    expect(address.type).toBe('group')
    expect(address.fields?.map((f) => f.name)).toEqual(['address.city', 'address.zip'])
    expect(address.fields?.find((f) => f.name === 'address.city')?.required).toBe(true)
  })
})

describe('parseJSONSchema — array of objects', () => {
  it('gives array item fields bare names (useFieldArray prefixes them itself)', () => {
    const fields = parseJSONSchema({
      type: 'object',
      properties: {
        members: {
          type: 'array',
          items: {
            type: 'object',
            properties: { name: { type: 'string' }, email: { type: 'string', format: 'email' } },
            required: ['name'],
          },
        },
      },
    } as const)

    const members = fields[0]
    expect(members.type).toBe('array')
    expect(members.fields?.map((f) => f.name)).toEqual(['name', 'email'])
    expect(members.fields?.find((f) => f.name === 'name')?.required).toBe(true)
  })

  it('leaves fields undefined for arrays of scalars', () => {
    const fields = parseJSONSchema({
      type: 'object',
      properties: { tags: { type: 'array', items: { type: 'string' } } },
    } as const)
    expect(fields[0].fields).toBeUndefined()
  })
})

describe('parseJSONSchema — $ref resolution', () => {
  it('resolves a local $ref against the schema itself (self-contained $defs)', () => {
    const schema = {
      type: 'object',
      properties: { role: { $ref: '#/$defs/Role' } },
      $defs: {
        Role: { type: 'string', enum: ['admin', 'user'] },
      },
    } as const
    const fields = parseJSONSchema(schema)
    expect(fields[0].type).toBe('select')
    expect(fields[0].options).toEqual([
      { label: 'admin', value: 'admin' },
      { label: 'user', value: 'user' },
    ])
  })

  it('resolves a local $ref against an explicit rootDocument', () => {
    const root: JSONSchemaDocument = {
      components: {
        schemas: {
          Role: { type: 'string', enum: ['admin', 'user'] },
        },
      },
    }
    const schema = {
      type: 'object' as const,
      properties: { role: { $ref: '#/components/schemas/Role' } },
    }
    const fields = parseJSONSchema(schema, root)
    expect(fields[0].type).toBe('select')
  })

  it('throws for an unresolvable pointer', () => {
    expect(() =>
      parseJSONSchema({
        type: 'object',
        properties: { role: { $ref: '#/$defs/Missing' } },
      } as const),
    ).toThrow()
  })

  it('throws for a non-local (external) $ref', () => {
    expect(() =>
      parseJSONSchema({
        type: 'object',
        properties: { role: { $ref: 'https://example.com/schema.json' } },
      } as const),
    ).toThrow()
  })
})

describe('parseJSONSchema — error cases', () => {
  it('throws when the schema has no "properties"', () => {
    expect(() => parseJSONSchema({ type: 'object' } as const)).toThrow()
  })

  it('throws when the schema type is not "object"', () => {
    expect(() => parseJSONSchema({ type: 'string' } as never)).toThrow()
  })
})

describe('parseOpenAPI — by JSON pointer', () => {
  const document: JSONSchemaDocument = {
    components: {
      schemas: {
        User: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            role: { $ref: '#/components/schemas/Role' },
          },
          required: ['name'],
        },
        Role: { type: 'string', enum: ['admin', 'user'] },
      },
    },
  }

  it('extracts and parses a schema by pointer, resolving nested $refs against the document', () => {
    const fields = parseOpenAPI(document, '#/components/schemas/User')
    expect(fields.find((f) => f.name === 'name')?.required).toBe(true)
    expect(fields.find((f) => f.name === 'role')?.type).toBe('select')
  })
})

describe('parseOpenAPI — by request body selector', () => {
  const document: JSONSchemaDocument = {
    paths: {
      '/users': {
        post: {
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { name: { type: 'string' } },
                  required: ['name'],
                },
              },
            },
          },
        },
      },
    },
  }

  it('defaults to method "post" and contentType "application/json"', () => {
    const fields = parseOpenAPI(document, { path: '/users' })
    expect(fields[0].name).toBe('name')
    expect(fields[0].required).toBe(true)
  })

  it('throws a clear error when the operation/content type is not found', () => {
    expect(() => parseOpenAPI(document, { path: '/unknown' })).toThrow()
    expect(() => parseOpenAPI(document, { path: '/users', method: 'get' })).toThrow()
    expect(() => parseOpenAPI(document, { path: '/users', contentType: 'text/xml' })).toThrow()
  })
})
