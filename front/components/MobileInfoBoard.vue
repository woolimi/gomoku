<script setup lang="ts">
import { onClickOutside } from "@vueuse/core";

const isOpen = ref(false);
const infoEl = ref<HTMLElement>();

onClickOutside(infoEl, () => {
  isOpen.value = false;
});
watch(
  isOpen,
  (_isOpen) => {
    window.document.body.style.overflow = _isOpen ? "hidden" : "auto";
  },
  { immediate: true },
);
</script>
<template>
  <div class="relative">
    <Button
      icon="pi pi-bars"
      variant="text"
      rounded
      class="!text-white hover:!text-black lg:hidden"
      aria-label="Open game info"
      @click="isOpen = true"
    />

    <Transition name="slide-left">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-[998] h-screen w-full bg-black/40"
        @click.self="isOpen = false"
      >
        <div
          ref="infoEl"
          class="infoEl absolute right-0 top-0 z-[999] flex h-full w-[min(300px,85vw)] flex-col rounded-l-xl bg-zinc-100 shadow-2xl"
        >
          <div class="flex shrink-0 items-center justify-end border-b border-zinc-200 bg-zinc-100 px-3 py-2 rounded-tl-xl">
            <button
              type="button"
              class="rounded-full p-2 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900"
              aria-label="Close"
              @click="isOpen = false"
            >
              <i class="pi pi-times text-lg"></i>
            </button>
          </div>
          <div class="min-h-0 flex-1 overflow-y-auto">
            <InfoBoard class="!max-h-none !max-w-full !self-stretch shadow-none" />
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped lang="scss">
.slide-left-enter-active {
  transition: all 0.1s ease;

  .infoEl {
    transition: all 0.2s ease;
  }
}
.slide-left-leave-active {
  transition: all 0.3s ease;
  .infoEl {
    transition: all 0.2s ease;
  }
}
.slide-left-enter-from,
.slide-left-leave-to {
  .infoEl {
    transform: translateX(100%);
  }
}
</style>
