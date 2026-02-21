<template>
  <figure
    class="docs-prose-img mx-auto my-3 flex w-full cursor-zoom-in flex-col justify-center"
    role="button"
    tabindex="0"
    aria-label="이미지 확대"
    @click="open = true"
    @keydown.enter="open = true"
    @keydown.space.prevent="open = true"
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
    <figcaption v-if="hasCaption" class="text-center text-sm text-gray-800">
      - {{ props.alt }} -
    </figcaption>
  </figure>

  <ClientOnly>
    <Dialog
      v-model:visible="open"
      modal
      dismissable-mask
      close-on-escape
      class="docs-image-dialog w-[90vw] max-w-4xl overflow-hidden !p-0 [&_.p-dialog-content]:!overflow-hidden [&_.p-dialog-content]:!p-0"
      @hide="open = false"
    >
      <div
        class="flex max-h-[85vh] items-center justify-center p-4"
        @click.stop
      >
        <img
          :src="refinedSrc"
          :alt="props.alt"
          class="max-h-[80vh] w-auto max-w-full object-contain"
          loading="lazy"
        />
      </div>
    </Dialog>
  </ClientOnly>
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

const open = ref(false);
</script>

<style scoped>
/* (다이얼로그/마스크는 body로 텔레포트되므로 아래 스타일은 전역) */
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
