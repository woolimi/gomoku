<script setup lang="ts">
const props = defineProps({
  player1TotalCaptured: {
    type: Number,
    default: 0,
  },
  player2TotalCaptured: {
    type: Number,
    default: 0,
  },
});

const { settings } = storeToRefs(useGameStore());
</script>
<template>
  <section
    class="flex items-center justify-between gap-6 rounded-md border border-zinc-200 bg-zinc-50/80 px-2 py-1.5"
  >
    <div class="flex items-baseline justify-center gap-0.5">
      <span class="text-2xl font-medium text-zinc-800">{{ player1TotalCaptured }}</span>
      <span class="text-sm text-zinc-500">/{{ settings.totalPairCaptured }}</span>
    </div>

    <span class="text-xs font-medium uppercase tracking-wide text-zinc-500">Pair captured</span>

    <div class="flex items-baseline justify-center gap-0.5">
      <span class="text-2xl font-medium text-zinc-800">{{ player2TotalCaptured }}</span>
      <span class="text-sm text-zinc-500">/{{ settings.totalPairCaptured }}</span>
    </div>
  </section>
</template>
