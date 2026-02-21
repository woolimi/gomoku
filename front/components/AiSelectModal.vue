<script setup lang="ts">
import { useVModels } from "@vueuse/core";

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
});
const emit = defineEmits(["update:visible"]);
const { visible: _visible } = useVModels(props, emit);
const { settings } = storeToRefs(useGameStore());

const onSelect = () => {
  _visible.value = false;
};

const isAlphaZero = computed(() => settings.value.ai === "alphazero");
const docsAlphaZeroUrl = "/docs/alphazero/intro";

watch(isAlphaZero, (v) => {
  if (v) {
    settings.value.enableDoubleThreeRestriction = true;
    settings.value.enableCapture = true;
    settings.value.totalPairCaptured = 5;
    settings.value.advantage1 = 0;
    settings.value.advantage2 = 0;
  }
}, { immediate: true });
</script>

<template>
  <Dialog
    v-model:visible="_visible"
    modal
    dismissableMask
    header="Select AI"
    :style="{ width: '90vw', maxWidth: '420px' }"
    class="bg-white"
    closeOnEscape
    pt:mask:class="backdrop-blur-sm"
  >
    <section class="flex flex-col items-center justify-center">
      <div class="m-2 mb-6 grid w-full grid-cols-2 gap-4">
        <button
          type="button"
          class="flex flex-col items-center gap-3 rounded-xl border-2 p-6 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2"
          :class="settings.ai === 'minimax'
            ? 'border-zinc-800 bg-zinc-100 ring-zinc-800'
            : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'"
          @click="settings.ai = 'minimax'"
        >
          <i
            class="pi pi-sitemap text-4xl"
            :class="settings.ai === 'minimax' ? 'text-zinc-800' : 'text-gray-500'"
            aria-hidden="true"
          />
          <span class="font-semibold">Minimax</span>
          <span class="text-center text-xs text-gray-500">Tree search engine</span>
        </button>
        <button
          type="button"
          class="flex flex-col items-center gap-3 rounded-xl border-2 p-6 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2"
          :class="settings.ai === 'alphazero'
            ? 'border-zinc-800 bg-zinc-100 ring-zinc-800'
            : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'"
          @click="settings.ai = 'alphazero'"
        >
          <i
            class="pi pi-android text-4xl"
            :class="settings.ai === 'alphazero' ? 'text-zinc-800' : 'text-gray-500'"
            aria-hidden="true"
          />
          <span class="font-semibold">AlphaZero</span>
          <span class="text-center text-xs text-gray-500">Neural network AI</span>
        </button>
      </div>
      <div
        v-if="settings.ai === 'alphazero'"
        class="mb-6 w-full rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900"
      >
        <p class="mb-2 font-medium">AlphaZero mode: 200 MCTS simulations per move. During training, this was increased to 2,400.</p>
        <p class="mb-2 font-medium">Also, evaluation is not supported in AlphaZero mode.</p>
        <NuxtLink
          :to="docsAlphaZeroUrl"
          class="font-medium underline hover:no-underline"
          @click="_visible = false"
        >
          See more details in docs
        </NuxtLink>
      </div>

      <Button label="Select" class="w-full" @click="onSelect" />
    </section>
  </Dialog>
</template>
