<template>
  <div class="relative my-6 rounded-lg bg-slate-800 px-4 py-1 text-gray-100">
    <pre :class="$props.class">
      <slot />
    </pre>
    <span class="absolute bottom-[16px] right-[16px] text-sm !text-gray-100">
      {{ language || filename }}
    </span>
  </div>
</template>

<script setup lang="ts">
defineProps({
  code: {
    type: String,
    default: "",
  },
  language: {
    type: String,
    default: null,
  },
  filename: {
    type: String,
    default: null,
  },
  highlights: {
    type: Array as () => number[],
    default: () => [],
  },
  meta: {
    type: String,
    default: null,
  },
  class: {
    type: String,
    default: null,
  },
});
</script>

<style scoped>
pre {
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  white-space: pre;
  word-break: normal;
  overflow-wrap: normal;
  scrollbar-width: thin;
  scrollbar-color: rgba(148, 163, 184, 0.55) rgba(255, 255, 255, 0.06);
}

pre :deep(code) {
  display: block;
  width: fit-content;
  min-width: 100%;
  white-space: pre;
}

pre :deep(code .line) {
  display: block;
  margin: 0 !important;
  padding: 0 !important;
  text-indent: 0 !important;
}

pre :deep(code .line::before) {
  content: none !important;
  display: none !important;
}

pre::-webkit-scrollbar {
  height: 8px;
}

pre::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.06);
  border-radius: 9999px;
}

pre::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.55);
  border-radius: 9999px;
}

pre::-webkit-scrollbar-thumb:hover {
  background: rgba(148, 163, 184, 0.75);
}

pre::-webkit-scrollbar-corner {
  background: transparent;
}
</style>
