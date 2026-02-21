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
    class="bg-stone-950 px-6 py-6 text-white"
    :class="{ 'border-t border-stone-700': props.nonGamePage }"
  >
    <div
      class="mx-auto flex max-w-[800px] flex-col gap-6 sm:flex-row sm:items-start sm:justify-between"
    >
      <section class="flex flex-col gap-1">
        <span class="text-xs font-semibold uppercase tracking-wider text-stone-500">
          AI & Backend
        </span>
        <a
          href="https://sungyongcho.com"
          target="_blank"
          rel="noopener"
          class="w-fit text-stone-300 underline underline-offset-2 transition-colors hover:text-white"
        >
          Sungyong Cho
        </a>
        <a
          href="mailto:here@sungyongcho.com"
          target="_blank"
          rel="noopener"
          class="mt-1 flex w-fit items-center gap-1.5 text-sm text-stone-400 underline-offset-2 transition-colors hover:text-stone-200"
        >
          <i class="pi pi-envelope text-[0.7rem] pt-1" aria-hidden="true" />
          <span class="underline">here@sungyongcho.com</span>
        </a>
      </section>
      <section class="flex flex-col gap-1">
        <span class="text-xs font-semibold uppercase tracking-wider text-stone-500">
          Frontend
        </span>
        <a
          href="https://woolimi.github.io"
          target="_blank"
          rel="noopener"
          class="w-fit text-stone-300 underline underline-offset-2 transition-colors hover:text-white"
        >
          Woolim Park
        </a>
      </section>
    </div>
  </footer>
</template>
