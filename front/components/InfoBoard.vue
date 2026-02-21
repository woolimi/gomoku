<script setup lang="ts">
import player1Image from "~/assets/player1.webp";
import player2Image from "~/assets/player2.webp";
import aiImage from "~/assets/ai.webp";
import { useClipboard } from "@vueuse/core";

const {
  _histories,
  player1TotalCaptured,
  player2TotalCaptured,
  settings,
  turn,
  historyMode,
  isAiThinking,
  showSettings,
} = storeToRefs(useGameStore());
const { historyToLog, exportUrl, exportJson } = useGameStore();
const historyEl = ref<HTMLElement>();
const route = useRoute();
const isDebug = computed(() => route.name === "debug");
const exportedData = ref("");
const { copy, copied, isSupported } = useClipboard({
  source: exportedData,
  legacy: true,
});

const onExportUrl = () => {
  const url = exportUrl();
  copy(url);
};
const aiHistories = computed(() => {
  return _histories.value.filter((h) => !!h.executionTime?.ms);
});

const onExportJson = () => {
  exportJson();
};

const aiAverageResponseTime = computed(() => {
  return (
    aiHistories.value.reduce((a, b) => a + (b.executionTime?.ms ?? 0), 0) /
    (aiHistories.value.length || 1)
  ).toFixed(0);
});

watch(
  () => [_histories.value?.length],
  () => {
    nextTick(() => {
      if (!historyEl.value) return;
      const scrollHeight = historyEl.value!.scrollHeight;
      historyEl.value!.scroll(0, scrollHeight);
    });
  },
  { immediate: true },
);
</script>
<template>
  <aside class="flex max-h-[min(90vh,720px)] w-full max-w-[280px] flex-col gap-4 self-center rounded-xl bg-zinc-100 p-4 shadow-md -sm:max-w-none">
    <!-- Players & Settings -->
    <section class="flex flex-col gap-3">
      <div class="flex items-center justify-between gap-2">
        <span class="text-xs font-medium uppercase tracking-wide text-zinc-500">Match</span>
        <Button
          label="Settings"
          icon="pi pi-cog"
          variant="text"
          size="small"
          class="!text-xs !text-zinc-600 hover:!bg-zinc-200 hover:!text-zinc-900"
          @click="showSettings = true"
        />
      </div>
      <div class="flex items-center justify-between gap-4">
        <button
          type="button"
          class="flex flex-col items-center gap-1.5 transition-opacity"
          :class="isDebug ? 'hover:opacity-80' : 'cursor-default opacity-100'"
          :disabled="!isDebug"
          @click="
            settings.firstMove === 'Player1' ? (turn = 'X') : (turn = 'O')
          "
        >
          <InfoAvatar
              :image="player1Image"
              :loading="
                isAiThinking &&
                ((settings.firstMove === 'Player1' && turn === 'X') ||
                  (settings.firstMove === 'Player2' && turn === 'O'))
              "
              size="xlarge"
              :color="settings.firstMove === 'Player1' ? 'black' : 'white'"
              :active="
                (settings.firstMove === 'Player1' && turn === 'X') ||
                (settings.firstMove === 'Player2' && turn === 'O')
              "
            />
          <span class="text-sm font-medium text-zinc-700">Player 1</span>
        </button>

        <div class="flex flex-col items-center">
          <span class="text-lg font-medium text-zinc-400">vs</span>
          <span class="text-xs text-zinc-500">Turn {{ Math.floor(_histories.length / 2) }}</span>
        </div>

        <button
          type="button"
          class="flex flex-col items-center gap-1.5 transition-opacity"
          :class="isDebug ? 'hover:opacity-80' : 'cursor-default opacity-100'"
          :disabled="!isDebug"
          @click="
            settings.firstMove === 'Player2' ? (turn = 'X') : (turn = 'O')
          "
        >
          <InfoAvatar
              :image="settings.isPlayer2AI ? aiImage : player2Image"
              :loading="
                isAiThinking &&
                ((settings.firstMove === 'Player1' && turn === 'O') ||
                  (settings.firstMove === 'Player2' && turn === 'X'))
              "
              size="xlarge"
              :color="settings.firstMove === 'Player2' ? 'black' : 'white'"
              :active="
                (settings.firstMove === 'Player1' && turn === 'O') ||
                (settings.firstMove === 'Player2' && turn === 'X')
              "
            />
          <span class="text-sm font-medium text-zinc-700">
            {{ settings.isPlayer2AI ? "AI" : "Player 2" }}
          </span>
        </button>
      </div>

      <CapturedScore
        v-if="settings.enableCapture"
        class="w-full"
        :player1-total-captured="player1TotalCaptured"
        :player2-total-captured="player2TotalCaptured"
      />
    </section>

    <!-- History panel: fixed max height so it doesn't grow past board -->
    <section class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
      <div class="flex shrink-0 items-center justify-between gap-2 border-b border-zinc-200 bg-zinc-50 px-3 py-2">
        <button
          type="button"
          class="rounded-md px-2 py-1 text-sm font-medium transition-colors"
          :class="
            historyMode
              ? 'bg-zinc-800 text-white'
              : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
          "
          @click="historyMode = !historyMode"
        >
          History
        </button>
        <ClientOnly>
          <div class="flex gap-1">
            <button
              v-if="isSupported"
              type="button"
              class="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
              @click="onExportUrl"
            >
              <span v-if="!copied">url</span>
              <span v-else>Copied!</span>
              <i class="pi pi-link text-[10px]"></i>
            </button>
            <button
              type="button"
              class="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
              @click="onExportJson"
            >
              json
              <i class="pi pi-download text-[10px]"></i>
            </button>
          </div>
        </ClientOnly>
      </div>

      <div
        ref="historyEl"
        class="h-[280px] shrink-0 overflow-y-auto bg-zinc-900 px-2 py-2 text-sm -sm:h-[220px]"
      >
        <ul class="space-y-0.5">
          <li
            v-for="(h, index) in _histories"
            :key="index"
            class="rounded px-2 py-0.5 font-mono text-xs text-zinc-400 last:bg-zinc-800 last:text-white last:font-medium"
          >
            {{ historyToLog(h) }}
          </li>
        </ul>
      </div>

      <div
        v-if="settings.isPlayer2AI"
        class="shrink-0 border-t border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-600"
      >
        AI avg: {{ aiAverageResponseTime }} ms
      </div>
    </section>
  </aside>
</template>
