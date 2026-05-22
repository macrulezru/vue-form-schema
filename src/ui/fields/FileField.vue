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
  if (Array.isArray(props.modelValue)) return props.modelValue
  return [props.modelValue]
})

const isMultiple = computed(() => props.field.multiple ?? false)

function applyFiles(fileList: FileList | null) {
  if (!fileList || fileList.length === 0) {
    emit('update:modelValue', null)
    return
  }
  if (isMultiple.value) {
    emit('update:modelValue', Array.from(fileList))
  } else {
    emit('update:modelValue', fileList[0])
  }
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

function onDragOver(e: DragEvent) {
  e.preventDefault()
  isDragging.value = true
}

function onDragLeave() {
  isDragging.value = false
}

function removeFile(index: number) {
  const updated = files.value.filter((_, i) => i !== index)
  if (updated.length === 0) {
    emit('update:modelValue', null)
    if (inputRef.value) inputRef.value.value = ''
  } else if (isMultiple.value) {
    emit('update:modelValue', updated)
  } else {
    emit('update:modelValue', updated[0])
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
      class="vfs-file-zone"
      :class="{ 'vfs-file-zone--dragging': isDragging }"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
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
        class="vfs-file-input"
        @change="onInputChange"
      />
      <label :for="field.name" class="vfs-file-label">
        <span class="vfs-file-icon" aria-hidden="true">📁</span>
        <span>{{ isDragging ? 'Drop files here' : 'Click to upload or drag & drop' }}</span>
        <span v-if="field.accept" class="vfs-file-hint">{{ field.accept }}</span>
      </label>
    </div>

    <ul v-if="files.length" class="vfs-file-list">
      <li
        v-for="(file, i) in files"
        :key="`${file.name}-${i}`"
        class="vfs-file-item"
      >
        <span class="vfs-file-name">{{ file.name }}</span>
        <span class="vfs-file-size">{{ formatSize(file.size) }}</span>
        <button
          type="button"
          class="vfs-file-remove"
          :aria-label="`Remove ${file.name}`"
          @click="removeFile(i)"
        >
          ×
        </button>
      </li>
    </ul>
  </BaseField>
</template>
