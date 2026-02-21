<script setup lang="ts">
const props = defineProps({
  prev: {
    type: Object as PropType<{ path: string; title: string }>,
    default: null,
  },
  next: {
    type: Object as PropType<{ path: string; title: string }>,
    default: null,
  },
});
</script>
<template>
  <div class="w-full px-6">
    <div class="flex justify-between py-6 gap-4 border-gray-200">
      <NuxtLink
        v-if="prev"
        :to="prev.path"
        class="inline-flex items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 active:bg-zinc-200"
      >
        <i class="pi pi-arrow-left text-sm" aria-hidden="true" />
        Prev
      </NuxtLink>
      <span v-else />

      <NuxtLink
        v-if="props.next"
        :to="next.path"
        class="inline-flex items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 active:bg-zinc-200"
      >
        Next
        <i class="pi pi-arrow-right text-sm" aria-hidden="true" />
      </NuxtLink>
      <span v-else />
    </div>
  </div>
</template>
