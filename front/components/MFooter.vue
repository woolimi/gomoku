<script setup lang="ts">
const props = defineProps({
  nonGamePage: {
    type: Boolean,
    default: false,
  },
});
</script>
<template>
  <footer
    class="flex items-center bg-stone-950 px-4 py-4 text-white sm:px-6 z-10"
    :class="{ 'border-t border-stone-700': props.nonGamePage }"
  >
    <div
      class="mx-auto flex w-full max-w-[800px] flex-col gap-2 sm:gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6"
    >
      <section class="flex flex-col gap-0.5 sm:gap-1">
        <span
          class="text-[10px] font-semibold uppercase tracking-wider text-stone-500 sm:text-xs"
        >
          AI & Backend
        </span>
        <a
          href="https://sungyongcho.com"
          target="_blank"
          rel="noopener"
          class="w-fit text-xs text-stone-300 underline underline-offset-2 transition-colors hover:text-white sm:text-sm"
        >
          Sungyong Cho
        </a>
        <a
          href="mailto:here@sungyongcho.com"
          target="_blank"
          rel="noopener"
          class="mt-0.5 hidden w-fit items-center gap-1 text-xs text-stone-400 underline-offset-2 transition-colors hover:text-stone-200 sm:mt-1 sm:flex sm:gap-1.5 sm:text-sm"
        >
          <i class="pi pi-envelope shrink-0 text-[0.6rem] sm:text-[0.7rem]" aria-hidden="true" />
          <span class="truncate underline sm:max-w-none">here@sungyongcho.com</span>
        </a>
      </section>
      <section class="flex flex-col gap-0.5 sm:gap-1">
        <span
          class="text-[10px] font-semibold uppercase tracking-wider text-stone-500 sm:text-xs"
        >
          Frontend
        </span>
        <a
          href="https://woolimi.github.io"
          target="_blank"
          rel="noopener"
          class="w-fit text-xs text-stone-300 underline underline-offset-2 transition-colors hover:text-white sm:text-sm"
        >
          Woolim Park
        </a>
      </section>
    </div>
  </footer>
</template>
