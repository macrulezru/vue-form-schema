import type { MaskConfig, MaskPreset } from './types'

// ─── Preset patterns ──────────────────────────────────────────────────────────

const PRESETS: Record<MaskPreset, string> = {
  'phone-ru': '+7 (###) ###-##-##',
  'phone-eu': '+## (##) ###-##-##',
  'date': '##.##.####',
  'inn': '############',
  'iban': 'AA## #### #### #### #### #### ####',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolvePattern(mask: MaskConfig): string {
  if (mask.preset) return PRESETS[mask.preset]
  return mask.pattern ?? ''
}

function isPlaceholder(ch: string): boolean {
  return ch === '#' || ch === 'A'
}

function matchesSlot(rawChar: string, slotChar: string): boolean {
  if (slotChar === '#') return /\d/.test(rawChar)
  if (slotChar === 'A') return /[a-zA-Z]/.test(rawChar)
  return false
}

// ─── applyMask ────────────────────────────────────────────────────────────────

/**
 * Apply mask to a *raw* input (no existing literals).
 * '#' = digit, 'A' = letter (uppercased), other mask chars are literals.
 *
 * Output extends only up to the last successfully filled placeholder —
 * no trailing literals are appended.
 */
export function applyMask(value: string, mask: string | MaskConfig): string {
  const config: MaskConfig = typeof mask === 'string' ? { pattern: mask } : mask
  const pattern = resolvePattern(config)
  if (!pattern) return value

  const rawChars = Array.from(value)
  let rawIdx = 0

  // First pass: find the last pattern index that gets a raw char placed
  let lastFilledMaskIdx = -1
  for (let maskIdx = 0; maskIdx < pattern.length && rawIdx < rawChars.length; maskIdx++) {
    const maskChar = pattern[maskIdx]
    if (isPlaceholder(maskChar)) {
      // Consume invalid raw chars for this slot type
      while (rawIdx < rawChars.length && !matchesSlot(rawChars[rawIdx], maskChar)) rawIdx++
      if (rawIdx < rawChars.length) {
        lastFilledMaskIdx = maskIdx
        rawIdx++
      }
    }
    // literals are skipped in the first pass
  }

  if (lastFilledMaskIdx === -1) return ''

  // Second pass: output pattern[0..lastFilledMaskIdx] substituting raw chars
  let result = ''
  rawIdx = 0
  for (let maskIdx = 0; maskIdx <= lastFilledMaskIdx; maskIdx++) {
    const maskChar = pattern[maskIdx]
    if (isPlaceholder(maskChar)) {
      while (rawIdx < rawChars.length && !matchesSlot(rawChars[rawIdx], maskChar)) rawIdx++
      if (rawIdx < rawChars.length) {
        result += maskChar === 'A' ? rawChars[rawIdx++].toUpperCase() : rawChars[rawIdx++]
      }
    } else {
      result += maskChar
    }
  }

  return result
}

// ─── removeMask ───────────────────────────────────────────────────────────────

/**
 * Remove mask formatting from a *masked* string, returning only the raw chars
 * that were placed in placeholder (#/A) slots.
 * Works positionally: aligns each value character against the pattern.
 */
export function removeMask(value: string, mask: string | MaskConfig): string {
  const config: MaskConfig = typeof mask === 'string' ? { pattern: mask } : mask
  const pattern = resolvePattern(config)
  if (!pattern) return value

  const result: string[] = []
  let valueIdx = 0

  for (let maskIdx = 0; maskIdx < pattern.length && valueIdx < value.length; maskIdx++) {
    const maskChar = pattern[maskIdx]
    const valueChar = value[valueIdx]

    if (isPlaceholder(maskChar)) {
      result.push(valueChar)
      valueIdx++
    } else {
      // Literal in pattern — skip matching char in value (or skip mismatch)
      if (valueChar === maskChar) valueIdx++
      // If it doesn't match, we skip the value char without consuming the mask position
      // (handles cases where literal was not typed)
    }
  }

  return result.join('')
}

// ─── Input event integration ──────────────────────────────────────────────────

/**
 * Attach mask handling to a native <input> element.
 * Returns a cleanup function.
 */
export function bindMask(
  input: HTMLInputElement,
  mask: string | MaskConfig,
): () => void {
  function onInput() {
    const raw = removeMask(input.value, mask)
    const masked = applyMask(raw, mask)
    if (input.value !== masked) {
      const pos = input.selectionStart ?? masked.length
      input.value = masked
      const newPos = Math.min(pos, masked.length)
      input.setSelectionRange(newPos, newPos)
    }
  }

  input.addEventListener('input', onInput)
  const initial = applyMask(removeMask(input.value, mask), mask)
  if (input.value !== initial && initial) input.value = initial

  return () => input.removeEventListener('input', onInput)
}
