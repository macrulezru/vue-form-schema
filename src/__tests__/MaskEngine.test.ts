import { describe, it, expect } from 'vitest'
import { applyMask, removeMask } from '../core/MaskEngine'

describe('applyMask — phone-ru preset', () => {
  it('formats partial input', () => {
    expect(applyMask('9161234567', { preset: 'phone-ru' })).toBe('+7 (916) 123-45-67')
  })

  it('handles fewer digits', () => {
    const result = applyMask('916', { preset: 'phone-ru' })
    // stops at last filled placeholder, no trailing literals
    expect(result).toMatch(/^\+7 \(916/)
  })
})

describe('applyMask — date preset', () => {
  it('formats DDMMYYYY to DD.MM.YYYY', () => {
    expect(applyMask('01012024', { preset: 'date' })).toBe('01.01.2024')
  })

  it('handles partial date', () => {
    expect(applyMask('0101', { preset: 'date' })).toBe('01.01')
  })
})

describe('applyMask — custom pattern', () => {
  it('applies # as digit placeholder', () => {
    expect(applyMask('12345', { pattern: '##-##-#' })).toBe('12-34-5')
  })

  it('applies A as letter placeholder', () => {
    expect(applyMask('ab123', { pattern: 'AA-###' })).toBe('AB-123')
  })

  it('skips invalid chars', () => {
    expect(applyMask('1a2b3', { pattern: '###' })).toBe('123')
  })

  it('truncates at pattern end', () => {
    expect(applyMask('123456789', { pattern: '###' })).toBe('123')
  })
})

describe('removeMask', () => {
  it('removes phone-ru literals', () => {
    const raw = removeMask('+7 (916) 123-45-67', { preset: 'phone-ru' })
    // +7 is a literal prefix in the pattern, so raw = 10-digit subscriber number
    expect(raw).toBe('9161234567')
  })

  it('removes date literals', () => {
    expect(removeMask('01.01.2024', { preset: 'date' })).toBe('01012024')
  })

  it('removes custom pattern literals', () => {
    expect(removeMask('12-34-5', { pattern: '##-##-#' })).toBe('12345')
  })

  it('returns value as-is for empty pattern', () => {
    expect(removeMask('hello', {})).toBe('hello')
  })
})

describe('applyMask — IBAN preset', () => {
  it('formats IBAN with spaces', () => {
    const iban = 'GB29NWBK60161331926819'
    const result = applyMask(iban, { preset: 'iban' })
    expect(result).toContain(' ')
  })
})

describe('applyMask — INN preset', () => {
  it('formats 12-digit INN', () => {
    expect(applyMask('123456789012', { preset: 'inn' })).toBe('123456789012')
  })
})
