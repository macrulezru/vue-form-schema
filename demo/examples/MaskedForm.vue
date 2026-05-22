<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useForm } from 'vue-form-schema'
import { applyMask, removeMask, bindMask } from 'vue-form-schema'
import type { FieldDefinition, MaskConfig } from 'vue-form-schema'

// ── Schema-level mask declaration ──────────────────────────────────────────
const schema: FieldDefinition[] = [
  {
    type: 'text',
    name: 'phone',
    label: 'Phone (RU)',
    placeholder: '+7 (___) ___-__-__',
    mask: { preset: 'phone-ru' },
    required: true,
  },
  {
    type: 'text',
    name: 'date',
    label: 'Date (DD.MM.YYYY)',
    placeholder: '__.__.____',
    mask: { preset: 'date' },
    required: true,
  },
  {
    type: 'text',
    name: 'inn',
    label: 'INN (12 digits)',
    mask: { preset: 'inn' },
  },
  {
    type: 'text',
    name: 'postcode',
    label: 'Postcode (AA####)',
    placeholder: 'AB1234',
    mask: { pattern: 'AA####' },
  },
  {
    type: 'text',
    name: 'cardNumber',
    label: 'Card number',
    placeholder: '#### #### #### ####',
    mask: { pattern: '#### #### #### ####' },
  },
]

const { values, setField } = useForm({ schema })

// ── Manual bindMask demo ────────────────────────────────────────────────────
const ibanInputRef = ref<HTMLInputElement | null>(null)
const ibanValue = ref('')
let ibanCleanup: (() => void) | null = null

onMounted(() => {
  if (ibanInputRef.value) {
    ibanCleanup = bindMask(ibanInputRef.value, { preset: 'iban' })
    ibanInputRef.value.addEventListener('input', () => {
      ibanValue.value = ibanInputRef.value?.value ?? ''
    })
  }
})

onUnmounted(() => ibanCleanup?.())

// ── Standalone API demo ─────────────────────────────────────────────────────
const rawInput = ref('9161234567')
const selectedPreset = ref<'phone-ru' | 'phone-eu' | 'date' | 'inn'>('phone-ru')

const presets: { label: string; value: 'phone-ru' | 'phone-eu' | 'date' | 'inn'; raw: string }[] = [
  { label: 'Phone RU',  value: 'phone-ru',  raw: '9161234567'   },
  { label: 'Phone EU',  value: 'phone-eu',  raw: '493012345678' },
  { label: 'Date',      value: 'date',       raw: '01012024'     },
  { label: 'INN',       value: 'inn',        raw: '123456789012' },
]

function selectPreset(p: typeof presets[0]) {
  selectedPreset.value = p.value
  rawInput.value = p.raw
}

const maskConfig = (): MaskConfig => ({ preset: selectedPreset.value })
const maskedOutput = () => applyMask(rawInput.value, maskConfig())
const rawOutput    = () => removeMask(maskedOutput(), maskConfig())

// Per-field mask handlers using setField
const fieldInputRefs: Record<string, HTMLInputElement | null> = {}
const fieldCleanups: Array<() => void> = []

function mountFieldMask(el: HTMLInputElement | null, fieldName: string, mask: string | MaskConfig) {
  if (!el) return
  fieldInputRefs[fieldName] = el
  const cleanup = bindMask(el, mask)
  el.addEventListener('input', () => setField(fieldName, removeMask(el.value, mask)))
  fieldCleanups.push(cleanup)
}

onUnmounted(() => fieldCleanups.forEach((fn) => fn()))
</script>

<template>
  <div>
    <div class="page-header">
      <h2>Input masking</h2>
      <p>
        Masks format input in real time. Use preset names or custom <code>#</code>/<code>A</code>
        patterns. Zero external dependencies.
      </p>
    </div>

    <!-- Preset table -->
    <div class="card">
      <div class="card-title">Built-in presets</div>
      <table style="width:100%;font-size:0.82rem;border-collapse:collapse">
        <thead>
          <tr style="color:var(--muted);text-align:left">
            <th style="padding:6px 10px">Preset</th>
            <th style="padding:6px 10px">Pattern</th>
            <th style="padding:6px 10px">Example</th>
          </tr>
        </thead>
        <tbody style="color:var(--text)">
          <tr v-for="row in [
            ['phone-ru', '+7 (###) ###-##-##', '+7 (916) 123-45-67'],
            ['phone-eu', '+## (##) ###-##-##', '+49 (30) 123-45-67'],
            ['date',     '##.##.####',          '01.01.2024'],
            ['inn',      '############',         '123456789012'],
            ['iban',     'AA## #### ####…',      'GB29 NWBK 6016…'],
          ]" :key="row[0]">
            <td style="padding:6px 10px;font-family:var(--mono);color:var(--accent)">{{ row[0] }}</td>
            <td style="padding:6px 10px;font-family:var(--mono)">{{ row[1] }}</td>
            <td style="padding:6px 10px;color:var(--muted)">{{ row[2] }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Standalone API playground -->
    <div class="card">
      <div class="card-title">Standalone API playground</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">
        <button
          v-for="p in presets" :key="p.value"
          class="btn btn-ghost"
          :style="selectedPreset === p.value ? 'border-color:var(--accent);color:var(--accent)' : ''"
          @click="selectPreset(p)"
        >
          {{ p.label }}
        </button>
      </div>
      <div class="field">
        <label>Raw input</label>
        <input
          :value="rawInput"
          style="font-family:var(--mono)"
          @input="rawInput = ($event.target as HTMLInputElement).value"
        />
      </div>
      <pre class="code-block">applyMask('{{ rawInput }}', { preset: '{{ selectedPreset }}' })
→ '{{ maskedOutput() }}'

removeMask('{{ maskedOutput() }}', { preset: '{{ selectedPreset }}' })
→ '{{ rawOutput() }}'</pre>
    </div>

    <!-- Masked fields connected to useForm -->
    <div class="card">
      <div class="card-title">Masked fields via schema + bindMask</div>
      <form novalidate>
        <div class="field">
          <label>Phone (RU)</label>
          <input
            :ref="(el) => mountFieldMask(el as HTMLInputElement, 'phone', { preset: 'phone-ru' })"
            placeholder="+7 (___) ___-__-__"
          />
          <div class="hint">Raw value: {{ values.phone ?? '—' }}</div>
        </div>

        <div class="field">
          <label>Date (DD.MM.YYYY)</label>
          <input
            :ref="(el) => mountFieldMask(el as HTMLInputElement, 'date', { preset: 'date' })"
            placeholder="__.__.____"
          />
          <div class="hint">Raw value: {{ values.date ?? '—' }}</div>
        </div>

        <div class="field">
          <label>Card number</label>
          <input
            :ref="(el) => mountFieldMask(el as HTMLInputElement, 'cardNumber', { pattern: '#### #### #### ####' })"
            placeholder="#### #### #### ####"
            style="font-family:var(--mono);letter-spacing:0.05em"
          />
          <div class="hint">Raw value: {{ values.cardNumber ?? '—' }}</div>
        </div>

        <div class="field">
          <label>IBAN (via <code>bindMask</code> directly)</label>
          <input
            ref="ibanInputRef"
            placeholder="GB__ ____ ____ ____ ____ ____ ____"
            style="font-family:var(--mono);letter-spacing:0.04em"
          />
          <div class="hint">Masked: {{ ibanValue || '—' }}</div>
        </div>

        <div class="field">
          <label>Postcode (AA####)</label>
          <input
            :ref="(el) => mountFieldMask(el as HTMLInputElement, 'postcode', { pattern: 'AA####' })"
            placeholder="AB1234"
            style="text-transform:uppercase"
          />
          <div class="hint">Raw value: {{ values.postcode ?? '—' }}</div>
        </div>
      </form>
    </div>

    <div class="card">
      <div class="card-title">Values in useForm</div>
      <pre class="values-preview">{{ JSON.stringify(values, null, 2) }}</pre>
    </div>
  </div>
</template>
