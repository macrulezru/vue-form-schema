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
      class="border-input relative rounded-md border border-dashed p-6 text-center transition-colors"
      :class="
        isDragging
          ? 'border-ring bg-accent'
          : touched && error?.length
            ? 'border-destructive'
            : 'hover:border-ring/60'
      "
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
      <div class="text-muted-foreground pointer-events-none space-y-1 text-sm">
        <p>{{ isDragging ? 'Drop files here' : 'Click to upload or drag & drop' }}</p>
        <p v-if="field.accept" class="text-xs">{{ field.accept }}</p>
      </div>
    </div>

    <ul v-if="files.length" class="mt-2 space-y-1">
      <li
        v-for="(file, i) in files"
        :key="`${file.name}-${i}`"
        class="border-input flex items-center justify-between rounded-md border px-3 py-2 text-sm"
      >
        <span class="truncate">{{ file.name }}</span>
        <span class="text-muted-foreground ml-2 shrink-0 text-xs">{{ formatSize(file.size) }}</span>
        <button
          type="button"
          :aria-label="`Remove ${file.name}`"
          class="text-muted-foreground hover:text-destructive ml-2 shrink-0 transition-colors"
          @click="removeFile(i)"
        >
          ×
        </button>
      </li>
    </ul>
  </BaseField>
</template>
