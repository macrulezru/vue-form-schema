<script setup lang="ts">
import { computed, ref } from 'vue'
import { useForm } from 'vue-form-schema'
import type { FieldDefinition } from 'vue-form-schema'

const schema: FieldDefinition[] = [
  // ── Section 1: account type determines what is shown ──
  {
    type: 'radio',
    name: 'accountType',
    label: 'Account type',
    defaultValue: 'personal',
    options: [
      { label: 'Personal', value: 'personal' },
      { label: 'Business', value: 'business' },
    ],
  },

  // shown only for business accounts
  {
    type: 'text',
    name: 'companyName',
    label: 'Company name',
    placeholder: 'Acme Corp',
    required: true,
    visible: (v) => v['accountType'] === 'business',
  },
  {
    type: 'text',
    name: 'vatNumber',
    label: 'VAT number',
    placeholder: 'DE123456789',
    visible: (v) => v['accountType'] === 'business',
  },

  // ── Section 2: age gate with a string expression ──
  {
    type: 'number',
    name: 'age',
    label: 'Your age',
    placeholder: '25',
    required: true,
  },
  {
    type: 'select',
    name: 'drinkChoice',
    label: 'Drink preference',
    // string expression — evaluated against `values`
    visible: 'values.age >= 18',
    options: [
      { label: 'Beer',    value: 'beer'   },
      { label: 'Wine',    value: 'wine'   },
      { label: 'Cocktail', value: 'cocktail' },
      { label: 'Water',   value: 'water'  },
    ],
  },
  {
    type: 'text',
    name: 'minorNote',
    label: 'A note for minors',
    defaultValue: 'Only non-alcoholic drinks are available for you.',
    disabled: true,
    visible: (v) => typeof v['age'] === 'number' && Number(v['age']) > 0 && Number(v['age']) < 18,
  },

  // ── Section 3: clearOnHide demo ──
  {
    type: 'checkbox',
    name: 'hasPromoCode',
    label: 'I have a promo code',
  },
  {
    type: 'text',
    name: 'promoCode',
    label: 'Promo code',
    placeholder: 'SAVE20',
    visible: (v) => v['hasPromoCode'] === true,
  },
]

const submitted = ref<Record<string, unknown> | null>(null)

const { fields, values, errors, touched, isDirty, submit, reset, setField } = useForm({
  schema,
  validateOn: 'blur',
  clearOnHide: true,
  onSubmit: async (data) => {
    await new Promise((r) => setTimeout(r, 500))
    submitted.value = data
  },
})

function touch(name: string) { touched.value[name] = true }
function hasError(name: string) { return touched.value[name] && errors.value[name]?.length }

const visibleFields = computed(() => fields.value.filter((f) => f.visible !== false))
function isVisible(name: string) { return visibleFields.value.some((f) => f.name === name) }
function isDisabled(name: string) { return fields.value.find((f) => f.name === name)?.disabled === true }

const accountOptions = [{ label: 'Personal', value: 'personal' }, { label: 'Business', value: 'business' }]
const drinkOptions   = schema.find((f) => f.name === 'drinkChoice')!.options!
</script>

<template>
  <div>
    <div class="page-header">
      <h2>Conditional fields</h2>
      <p>
        Fields can show / hide / disable based on current values using a <strong>function</strong>
        or a <strong>string expression</strong>. When <code>clearOnHide: true</code> is set, hiding
        a field resets its value automatically.
      </p>
    </div>

    <div class="card">
      <div class="card-title">How it works</div>
      <pre class="code-block">// function condition
visible: (values) => values.accountType === 'business'

// string expression (safe subset of JS)
visible: 'values.age >= 18'

// useForm config
useForm({ schema, clearOnHide: true })</pre>
    </div>

    <div class="card">
      <form novalidate @submit.prevent="submit">

        <!-- Account type -->
        <div class="field">
          <label>Account type</label>
          <div class="radio-group">
            <label v-for="opt in accountOptions" :key="String(opt.value)" class="radio-label">
              <input
                type="radio"
                :name="'accountType'"
                :value="opt.value"
                :checked="values.accountType === opt.value"
                @change="setField('accountType', opt.value)"
              />
              {{ opt.label }}
            </label>
          </div>
        </div>

        <!-- Business fields — shown conditionally -->
        <Transition name="slide">
          <div v-if="isVisible('companyName')">
            <div class="field">
              <label>Company name <span class="req">*</span></label>
              <input
                :value="values.companyName ?? ''"
                :class="{ 'has-error': hasError('companyName') }"
                placeholder="Acme Corp"
                @input="setField('companyName', ($event.target as HTMLInputElement).value)"
                @blur="touch('companyName')"
              />
              <div v-if="hasError('companyName')" class="field-error">{{ errors['companyName'][0] }}</div>
            </div>
            <div class="field">
              <label>VAT number <span style="color:var(--muted)">(optional)</span></label>
              <input
                :value="values.vatNumber ?? ''"
                placeholder="DE123456789"
                @input="setField('vatNumber', ($event.target as HTMLInputElement).value)"
              />
            </div>
          </div>
        </Transition>

        <hr class="divider" />

        <!-- Age gate -->
        <div class="field">
          <label>Your age <span class="req">*</span></label>
          <input
            type="number"
            :value="values.age ?? ''"
            :class="{ 'has-error': hasError('age') }"
            placeholder="25"
            @input="setField('age', Number(($event.target as HTMLInputElement).value) || null)"
            @blur="touch('age')"
          />
          <div v-if="hasError('age')" class="field-error">{{ errors['age'][0] }}</div>
        </div>

        <Transition name="slide">
          <div v-if="isVisible('drinkChoice')" class="field">
            <label>Drink preference <span style="color:var(--muted);font-size:0.72rem">(visible: "values.age >= 18")</span></label>
            <select @change="setField('drinkChoice', ($event.target as HTMLSelectElement).value)">
              <option value="" disabled :selected="!values.drinkChoice">Pick a drink</option>
              <option v-for="opt in drinkOptions" :key="String(opt.value)"
                :value="opt.value" :selected="values.drinkChoice === opt.value">
                {{ opt.label }}
              </option>
            </select>
          </div>
        </Transition>

        <Transition name="slide">
          <div v-if="isVisible('minorNote')" class="field">
            <label>Note</label>
            <input :value="values.minorNote" disabled style="opacity:0.5" />
          </div>
        </Transition>

        <hr class="divider" />

        <!-- Promo code -->
        <div class="field">
          <label class="checkbox-label">
            <input
              type="checkbox"
              :checked="!!values.hasPromoCode"
              @change="setField('hasPromoCode', ($event.target as HTMLInputElement).checked)"
            />
            I have a promo code
          </label>
        </div>

        <Transition name="slide">
          <div v-if="isVisible('promoCode')" class="field">
            <label>Promo code <span style="color:var(--muted);font-size:0.72rem">(cleared on hide)</span></label>
            <input
              :value="values.promoCode ?? ''"
              placeholder="SAVE20"
              style="text-transform: uppercase"
              @input="setField('promoCode', ($event.target as HTMLInputElement).value.toUpperCase())"
            />
          </div>
        </Transition>

        <div class="btn-row">
          <button type="submit" class="btn btn-primary">Submit</button>
          <button type="button" class="btn btn-ghost" @click="reset()">Reset</button>
        </div>
      </form>
    </div>

    <div v-if="submitted" class="card">
      <div class="card-title">✅ Submitted (hidden fields are not included when clearOnHide=true)</div>
      <pre class="values-preview">{{ JSON.stringify(submitted, null, 2) }}</pre>
    </div>

    <div class="card">
      <div class="card-title">Live values</div>
      <pre class="values-preview">{{ JSON.stringify(values, null, 2) }}</pre>
    </div>
  </div>
</template>

<style scoped>
.slide-enter-active,
.slide-leave-active { transition: all 0.2s ease; }
.slide-enter-from,
.slide-leave-to { opacity: 0; transform: translateY(-6px); }
</style>
