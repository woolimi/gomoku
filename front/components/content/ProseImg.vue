<!--
  Wrapper MUST be inline (e.g. span). Markdown puts ProseImg inside <p>; block elements
  like <figure> inside <p> are invalid HTML and cause server/client DOM mismatch → hydration error.
  See: https://github.com/nuxt-modules/mdc/issues/212, nuxt/content#1537
-->
<template>
  <span
    class="docs-prose-img block mx-auto my-3 flex w-full cursor-zoom-in flex-col justify-center"
    role="button"
    tabindex="0"
    aria-label="이미지 확대"
    @click="imageDialog.open(refinedSrc, props.alt)"
    @keydown.enter="imageDialog.open(refinedSrc, props.alt)"
    @keydown.space.prevent="imageDialog.open(refinedSrc, props.alt)"
  >
    <component
      :is="ImageComponent"
      :src="refinedSrc"
      :alt="props.alt"
      :width="props.width"
      :height="props.height"
      class="object-cover"
      v-bind="$attrs"
    />
    <span v-if="hasCaption" class="text-center text-sm text-gray-800">
      - {{ props.alt }} -
    </span>
  </span>
</template>

<script setup lang="ts">
import { withTrailingSlash, withLeadingSlash, joinURL } from "ufo";
import { useRuntimeConfig, computed } from "#imports";

import ImageComponent from "#build/mdc-image-component.mjs";

defineOptions({
  inheritAttrs: false,
});

const props = defineProps({
  src: {
    type: String,
    default: "",
  },
  alt: {
    type: String,
    default: "",
  },
  width: {
    type: [String, Number],
    default: undefined,
  },
  height: {
    type: [String, Number],
    default: undefined,
  },
});

const refinedSrc = computed(() => {
  if (props.src?.startsWith("/") && !props.src.startsWith("//")) {
    const _base = withLeadingSlash(
      withTrailingSlash(useRuntimeConfig().app.baseURL),
    );
    if (_base !== "/" && !props.src.startsWith(_base)) {
      return joinURL(_base, props.src);
    }
  }
  return props.src;
});

const hasCaption = computed(() => props.alt.trim().length > 0);

const imageDialog = useDocsImageDialog();
</script>

<style scoped>
</style>
<style>
/* 이미지 확대 다이얼로그: 백드롭 더 어둡게 (마스크가 다이얼로그 바로 앞에 올 때) */
.p-dialog-mask:has(+ .docs-image-dialog.p-dialog) {
  background-color: rgba(0, 0, 0, 0.85);
}

/* 헤더 패딩 축소 (기본 1.25rem이 너무 두꺼움) */
.docs-image-dialog .p-dialog-header {
  --p-dialog-header-padding: 0.5rem;
}

/* 닫기(X) 버튼 크기 축소 */
.docs-image-dialog .p-dialog-header button,
.docs-image-dialog .p-dialog-header-close,
.docs-image-dialog .p-dialog-header-icons .p-button {
  width: 1.75rem !important;
  height: 1.75rem !important;
  min-width: 1.75rem !important;
  font-size: 0.75rem !important;
  padding: 0 !important;
}
</style>
