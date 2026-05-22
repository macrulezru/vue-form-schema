import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, nextTick } from 'vue'
import { useForm } from '../core/useForm'
import { fileType, fileSize, fileCount } from '../core/ValidationEngine'
import type { FieldDefinition } from '../core/types'

// ─── #14 File validators ──────────────────────────────────────────────────────

function mockFile(name: string, size: number, type: string): File {
  const file = new File(['x'.repeat(size)], name, { type })
  return file
}

describe('fileType validator', () => {
  it('passes when file matches accepted type prefix', () => {
    const file = mockFile('photo.jpg', 100, 'image/jpeg')
    expect(fileType(['image/'])(file, {})).toBeNull()
  })

  it('passes when file matches extension', () => {
    const file = mockFile('doc.pdf', 100, 'application/pdf')
    expect(fileType(['.pdf'])(file, {})).toBeNull()
  })

  it('fails when file type does not match', () => {
    const file = mockFile('virus.exe', 100, 'application/octet-stream')
    expect(fileType(['image/'])(file, {})).toBeTruthy()
  })

  it('passes with no files (null)', () => {
    expect(fileType(['image/'])(null, {})).toBeNull()
  })

  it('uses custom message', () => {
    const file = mockFile('bad.exe', 100, 'application/octet-stream')
    expect(fileType(['image/'], 'Images only')(file, {})).toBe('Images only')
  })

  it('validates array of files', () => {
    const files = [
      mockFile('a.jpg', 100, 'image/jpeg'),
      mockFile('b.exe', 100, 'application/octet-stream'),
    ]
    expect(fileType(['image/'])(files, {})).toBeTruthy()
  })
})

describe('fileSize validator', () => {
  it('passes when file is within size limit', () => {
    const file = mockFile('small.jpg', 500, 'image/jpeg')
    expect(fileSize(1024)(file, {})).toBeNull()
  })

  it('fails when file exceeds size limit', () => {
    const file = mockFile('big.jpg', 2048, 'image/jpeg')
    expect(fileSize(1024)(file, {})).toBeTruthy()
  })

  it('passes with no files', () => {
    expect(fileSize(1024)(null, {})).toBeNull()
  })

  it('uses custom message', () => {
    const file = mockFile('big.jpg', 2048, 'image/jpeg')
    expect(fileSize(1024, 'Too big')(file, {})).toBe('Too big')
  })

  it('formats size in message (KB)', () => {
    const file = mockFile('big.jpg', 2048, 'image/jpeg')
    const msg = fileSize(1024)(file, {})
    expect(msg).toContain('KB')
  })
})

describe('fileCount validator', () => {
  it('passes when file count is within limit', () => {
    const files = [mockFile('a.jpg', 100, 'image/jpeg')]
    expect(fileCount(3)(files, {})).toBeNull()
  })

  it('fails when too many files', () => {
    const files = [
      mockFile('a.jpg', 100, 'image/jpeg'),
      mockFile('b.jpg', 100, 'image/jpeg'),
      mockFile('c.jpg', 100, 'image/jpeg'),
    ]
    expect(fileCount(2)(files, {})).toBeTruthy()
  })

  it('passes with null', () => {
    expect(fileCount(1)(null, {})).toBeNull()
  })

  it('uses custom message', () => {
    const files = [mockFile('a.jpg', 100, 'image/jpeg'), mockFile('b.jpg', 100, 'image/jpeg')]
    expect(fileCount(1, 'Only 1 file')(files, {})).toBe('Only 1 file')
  })
})

// ─── #14 useForm with type: 'file' ───────────────────────────────────────────

describe("useForm with type: 'file'", () => {
  it("initialises file field value to null", () => {
    const schema: FieldDefinition[] = [{ type: 'file', name: 'avatar' }]
    const w = mount(defineComponent({
      setup() { return useForm({ schema }) },
      template: '<div/>',
    }))
    expect(w.vm.values.avatar).toBeNull()
  })

  it('sets File value via setField', async () => {
    const schema: FieldDefinition[] = [{ type: 'file', name: 'doc' }]
    const w = mount(defineComponent({
      setup() { return useForm({ schema }) },
      template: '<div/>',
    }))
    const file = mockFile('doc.pdf', 500, 'application/pdf')
    w.vm.setField('doc', file)
    await nextTick()
    // values is reactive — compare by name/size rather than reference identity
    expect((w.vm.values.doc as File).name).toBe('doc.pdf')
    expect((w.vm.values.doc as File).size).toBe(500)
  })

  it('validates file type on submit', async () => {
    const schema: FieldDefinition[] = [{
      type: 'file',
      name: 'img',
      validators: [fileType(['image/'], 'Images only')],
    }]
    const w = mount(defineComponent({
      setup() { return useForm({ schema }) },
      template: '<div/>',
    }))
    const badFile = mockFile('bad.exe', 100, 'application/octet-stream')
    w.vm.setField('img', badFile)
    await w.vm.submit()
    expect(w.vm.errors.img).toContain('Images only')
  })

  it('validates file size on submit', async () => {
    const schema: FieldDefinition[] = [{
      type: 'file',
      name: 'upload',
      validators: [fileSize(100, 'Too large')],
    }]
    const w = mount(defineComponent({
      setup() { return useForm({ schema }) },
      template: '<div/>',
    }))
    const bigFile = mockFile('big.jpg', 500, 'image/jpeg')
    w.vm.setField('upload', bigFile)
    await w.vm.submit()
    expect(w.vm.errors.upload).toContain('Too large')
  })

  it('passes submit when file is valid', async () => {
    const submitted: unknown[] = []
    const schema: FieldDefinition[] = [{
      type: 'file',
      name: 'pic',
      validators: [fileSize(10_000)],
    }]
    const w = mount(defineComponent({
      setup() { return useForm({ schema, onSubmit: (v) => { submitted.push(v) } }) },
      template: '<div/>',
    }))
    const goodFile = mockFile('ok.jpg', 500, 'image/jpeg')
    w.vm.setField('pic', goodFile)
    await w.vm.submit()
    expect(submitted).toHaveLength(1)
  })
})
