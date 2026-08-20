<script setup lang="ts">
import { ref, computed } from 'vue'
import { NFormItem } from 'naive-ui'
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

const hasError = computed(() => !!(props.touched && props.error?.length))

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
  <NFormItem
    :label="field.label"
    :required="field.required"
    :validation-status="hasError ? 'error' : undefined"
    :show-feedback="hasError"
  >
    <template v-if="hasError" #feedback>
      <div v-for="(msg, i) in error" :key="i">{{ msg }}</div>
    </template>
    <div style="width: 100%">
      <div
        class="vfs-naive-dropzone"
        :class="{
          'vfs-naive-dropzone--dragging': isDragging,
          'vfs-naive-dropzone--error': hasError,
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
          class="vfs-naive-dropzone__input"
          @change="onInputChange"
        />
        <div class="vfs-naive-dropzone__hint">
          <p>{{ isDragging ? 'Drop files here' : 'Click to upload or drag & drop' }}</p>
          <p v-if="field.accept" class="vfs-naive-dropzone__accept">{{ field.accept }}</p>
        </div>
      </div>

      <ul v-if="files.length" class="vfs-naive-filelist">
        <li v-for="(file, i) in files" :key="`${file.name}-${i}`" class="vfs-naive-filelist__item">
          <span class="vfs-naive-filelist__name">{{ file.name }}</span>
          <span class="vfs-naive-filelist__size">{{ formatSize(file.size) }}</span>
          <button
            type="button"
            :aria-label="`Remove ${file.name}`"
            class="vfs-naive-filelist__remove"
            @click="removeFile(i)"
          >
            ×
          </button>
        </li>
      </ul>
    </div>
  </NFormItem>
</template>

<style scoped>
/*
 * Naive UI's design tokens are component-scoped CSS custom properties (not
 * meant to be referenced from outside the library), so this dropzone uses a
 * small self-contained, theme-neutral style instead — same approach as the
 * PrimeVue theme's FileField.
 */
.vfs-naive-dropzone {
  position: relative;
  border: 2px dashed #d9d9d9;
  border-radius: 3px;
  padding: 1.5rem;
  text-align: center;
  transition: border-color 0.15s;
}
.vfs-naive-dropzone:hover {
  border-color: #36ad6a;
}
.vfs-naive-dropzone--dragging {
  border-color: #36ad6a;
  background: rgba(54, 173, 106, 0.08);
}
.vfs-naive-dropzone--error {
  border-color: #d03050;
}
.vfs-naive-dropzone__input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}
.vfs-naive-dropzone__input:disabled {
  cursor: not-allowed;
}
.vfs-naive-dropzone__hint {
  pointer-events: none;
  font-size: 0.875rem;
  color: rgba(0, 0, 0, 0.5);
}
.vfs-naive-dropzone__accept {
  font-size: 0.75rem;
  margin-top: 0.25rem;
}
.vfs-naive-filelist {
  list-style: none;
  margin: 0.5rem 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.vfs-naive-filelist__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid #e0e0e6;
  border-radius: 3px;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
}
.vfs-naive-filelist__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.vfs-naive-filelist__size {
  margin-left: 0.5rem;
  flex-shrink: 0;
  font-size: 0.75rem;
  color: rgba(0, 0, 0, 0.5);
}
.vfs-naive-filelist__remove {
  margin-left: 0.5rem;
  flex-shrink: 0;
  color: rgba(0, 0, 0, 0.5);
  background: none;
  border: none;
  cursor: pointer;
}
.vfs-naive-filelist__remove:hover {
  color: #d03050;
}
</style>
