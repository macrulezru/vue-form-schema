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
      class="relative rounded-lg border-2 border-dashed p-6 text-center transition"
      :class="isDragging
        ? 'border-indigo-500 bg-indigo-500/10'
        : (touched && error?.length ? 'border-red-500 bg-red-500/5' : 'border-gray-700 bg-gray-900 hover:border-gray-500')"
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
        class="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
        @change="onInputChange"
      />
      <div class="pointer-events-none space-y-1">
        <div class="text-2xl">📁</div>
        <p class="text-sm text-gray-300">
          {{ isDragging ? 'Drop files here' : 'Click to upload or drag & drop' }}
        </p>
        <p v-if="field.accept" class="text-xs text-gray-500">{{ field.accept }}</p>
      </div>
    </div>

    <ul v-if="files.length" class="mt-2 space-y-1">
      <li
        v-for="(file, i) in files"
        :key="`${file.name}-${i}`"
        class="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm"
      >
        <span class="truncate text-gray-200">{{ file.name }}</span>
        <span class="ml-2 shrink-0 text-xs text-gray-500">{{ formatSize(file.size) }}</span>
        <button
          type="button"
          :aria-label="`Remove ${file.name}`"
          class="ml-2 shrink-0 text-gray-500 hover:text-red-400 transition"
          @click="removeFile(i)"
        >
          ×
        </button>
      </li>
    </ul>
  </BaseField>
</template>
