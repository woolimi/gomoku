<script lang="ts" setup>
import player1Image from "~/assets/player1.webp";
import player2Image from "~/assets/player2.webp";
import aiImage from "~/assets/ai.webp";

const props = defineProps({
  debug: {
    type: Boolean,
    default: false,
  },
});
const { player1TotalCaptured, player2TotalCaptured, settings, turn } =
  storeToRefs(useGameStore());
const { isAiThinking } = storeToRefs(useGameStore());
</script>

<template>
  <header class="w-full bg-black p-4">
    <div
      class="mx-auto flex max-w-[1280px] items-center justify-center -lg:justify-between -sm:flex-col -sm:gap-3"
    >
      <nuxt-link to="/" class="text-2xl font-extrabold uppercase text-white">
        omok
      </nuxt-link>

      <div class="text-white">
        <section class="flex items-center gap-4 -sm:gap-2 lg:hidden">
          <div class="flex items-center justify-center gap-2">
            <button
              :disabled="!debug"
              :class="{
                ['border-yellow-500']: turn === 'X',
              }"
              class="flex flex-col-reverse items-center border-2 border-transparent p-2"
              @click="turn = 'X'"
            >
              <span class="text-sm">Player1</span>
              <InfoAvatar
                :image="player1Image"
                :loading="isAiThinking && turn === 'X'"
              />
            </button>

            <div class="ml-2 rounded-lg border-2 border-white px-2 py-1">
              <span class="text-lg">
                {{ player1TotalCaptured }}
              </span>
              <span class="text-xs text-gray-300">
                / {{ settings.totalPairCaptured }}
              </span>
            </div>
          </div>

          <span class="text-2xl">vs</span>

          <div class="flex items-center justify-center gap-2">
            <div class="mr-2 rounded-lg border-2 border-white px-2 py-1">
              <span class="text-lg">
                {{ player2TotalCaptured }}
              </span>
              <span class="text-xs text-gray-300">
                / {{ settings.totalPairCaptured }}
              </span>
            </div>
            <button
              class="flex flex-col-reverse items-center border-2 border-transparent p-2"
              :disabled="!debug"
              :class="{ ['!border-yellow-500']: turn === 'O' }"
              @click="turn = 'O'"
            >
              <span class="text-sm">{{
                settings.isPlayer2AI ? "AI" : "Player2"
              }}</span>
              <InfoAvatar
                :image="settings.isPlayer2AI ? aiImage : player2Image"
                :loading="isAiThinking && turn === 'O'"
              />
            </button>
          </div>
        </section>
      </div>
    </div>
  </header>
</template>
