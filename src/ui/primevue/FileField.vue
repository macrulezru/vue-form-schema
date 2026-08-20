<script setup lang="ts">
import { ref, computed } from 'vue'
import BaseField from './BaseField.vue'
import type { FieldDefinition } from '../../core/types'

const props = defineProps<{
  field: FieldDefinition
  modelValue: File | File[] | null
  error?: string[]
  touched?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: File | File[] | null]
  blur: []
}>()

const isDragging = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)

const files = computed<File[]>(() => {
  if (!props.modelValue) return []
  return Array.isArray(props.modelValue) ? props.modelValue : [props.modelValue]
})

const isMultiple = computed(() => props.field.multiple ?? false)

function applyFiles(fileList: FileList | null) {
  if (!fileList || fileList.length === 0) {
    emit('update:modelValue', null)
    return
  }
  emit('update:modelValue', isMultiple.value ? Array.from(fileList) : fileList[0])
}

function onInputChange(e: Event) {
  applyFiles((e.target as HTMLInputElement).files)
  emit('blur')
}

function onDrop(e: DragEvent) {
  isDragging.value = false
  e.preventDefault()
  applyFiles(e.dataTransfer?.files ?? null)
  emit('blur')
}

function removeFile(index: number) {
  const updated = files.value.filter((_, i) => i !== index)
  if (updated.length === 0) {
    emit('update:modelValue', null)
    if (inputRef.value) inputRef.value.value = ''
  } else {
    emit('update:modelValue', isMultiple.value ? updated : updated[0])
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
</script>

<template>
  <BaseField v-slot="aria" :field="field" :error="error" :touched="touched">
    <div
      class="vfs-pv-dropzone"
      :class="{
        'vfs-pv-dropzone--dragging': isDragging,
        'vfs-pv-dropzone--error': touched && error?.length,
      }"
      @dragover.prevent="isDragging = true"
      @dragleave="isDragging = false"
      @drop="onDrop"
    >
      <input
        :id="field.name"
        ref="inputRef"
        type="file"
        :name="field.name"
        :accept="field.accept"
        :multiple="isMultiple"
        :disabled="field.disabled === true"
        :required="field.required"
        v-bind="aria"
        class="vfs-pv-dropzone__input"
        @change="onInputChange"
      />
      <div class="vfs-pv-dropzone__hint">
        <p>{{ isDragging ? 'Drop files here' : 'Click to upload or drag & drop' }}</p>
        <p v-if="field.accept" class="vfs-pv-dropzone__accept">{{ field.accept }}</p>
      </div>
    </div>

    <ul v-if="files.length" class="vfs-pv-filelist">
      <li v-for="(file, i) in files" :key="`${file.name}-${i}`" class="vfs-pv-filelist__item">
        <span class="vfs-pv-filelist__name">{{ file.name }}</span>
        <span class="vfs-pv-filelist__size">{{ formatSize(file.size) }}</span>
        <button
          type="button"
          :aria-label="`Remove ${file.name}`"
          class="vfs-pv-filelist__remove"
          @click="removeFile(i)"
        >
          ×
        </button>
      </li>
    </ul>
  </BaseField>
</template>

<style scoped>
/*
 * PrimeVue's design-token CSS variables depend on the preset the consumer
 * registers with the PrimeVue plugin, so this dropzone intentionally avoids
 * referencing them and uses a small self-contained, theme-neutral style
 * instead (unlike FormRenderer's <Message>/inputs, which delegate all
 * styling to PrimeVue itself).
 */
.vfs-pv-dropzone {
  position: relative;
  border: 2px dashed var(--p-surface-300, #cbd5e1);
  border-radius: 6px;
  padding: 1.5rem;
  text-align: center;
  transition: border-color 0.15s;
}
.vfs-pv-dropzone:hover {
  border-color: var(--p-primary-color, #6366f1);
}
.vfs-pv-dropzone--dragging {
  border-color: var(--p-primary-color, #6366f1);
  background: var(--p-primary-50, rgba(99, 102, 241, 0.08));
}
.vfs-pv-dropzone--error {
  border-color: var(--p-red-500, #ef4444);
}
.vfs-pv-dropzone__input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}
.vfs-pv-dropzone__input:disabled {
  cursor: not-allowed;
}
.vfs-pv-dropzone__hint {
  pointer-events: none;
  font-size: 0.875rem;
  color: var(--p-surface-500, #64748b);
}
.vfs-pv-dropzone__accept {
  font-size: 0.75rem;
  margin-top: 0.25rem;
}
.vfs-pv-filelist {
  list-style: none;
  margin: 0.5rem 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.vfs-pv-filelist__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid var(--p-surface-200, #e2e8f0);
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
}
.vfs-pv-filelist__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.vfs-pv-filelist__size {
  margin-left: 0.5rem;
  flex-shrink: 0;
  font-size: 0.75rem;
  color: var(--p-surface-500, #64748b);
}
.vfs-pv-filelist__remove {
  margin-left: 0.5rem;
  flex-shrink: 0;
  color: var(--p-surface-500, #64748b);
  background: none;
  border: none;
  cursor: pointer;
}
.vfs-pv-filelist__remove:hover {
  color: var(--p-red-500, #ef4444);
}
</style>
