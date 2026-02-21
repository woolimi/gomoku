<template>
  <div class="relative my-6 rounded-lg bg-slate-800 px-4 py-1 text-gray-100" ref="wrapperRef">
    <a
      v-if="githubSourceUrl"
      :href="githubSourceUrl"
      target="_blank"
      rel="noopener noreferrer"
      class="absolute right-4 top-3 z-10 flex items-center gap-1.5 rounded-md border border-slate-500/70 bg-slate-700/80 px-2.5 py-1 text-xs font-medium text-slate-100 no-underline transition hover:bg-slate-600/85 hover:text-white"
    >
      <i class="pi pi-github" />
      Open on GitHub
    </a>
    <pre :class="[props.class, githubSourceUrl ? 'mt-7' : '']">
      <slot />
    </pre>
    <span class="absolute bottom-[16px] right-[16px] text-sm !text-gray-100">
      {{ props.language || props.filename }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";

const props = defineProps({
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

const wrapperRef = ref<HTMLElement | null>(null);
const githubSourceUrl = ref<string | null>(null);

const getSourceInfo = (wrapper: HTMLElement): { href: string; paragraph: HTMLElement } | null => {
  const previous = wrapper.previousElementSibling;
  if (!(previous instanceof HTMLElement) || previous.tagName.toLowerCase() !== "p") {
    return null;
  }

  const text = previous.textContent?.trim().toLowerCase() || "";
  if (!text.startsWith("source:")) {
    return null;
  }

  const anchor = previous.querySelector<HTMLAnchorElement>("a[href*='github.com']");
  const href = anchor?.getAttribute("href")?.trim();
  if (!href) {
    return null;
  }

  return { href, paragraph: previous };
};

onMounted(() => {
  const wrapper = wrapperRef.value;
  if (!wrapper) {
    return;
  }

  const sourceInfo = getSourceInfo(wrapper);
  if (!sourceInfo) {
    return;
  }

  githubSourceUrl.value = sourceInfo.href;
  sourceInfo.paragraph.style.display = "none";
  sourceInfo.paragraph.setAttribute("aria-hidden", "true");
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
