<script lang="ts" setup>
const props = defineProps({
  debug: {
    type: Boolean,
    default: false,
  },
  nonGamePage: {
    type: Boolean,
    default: false,
  },
  testPage: {
    type: Boolean,
    default: false,
  },
  docPage: {
    type: Boolean,
    default: false,
  },
});
const gameStore = useGameStore();
const { initGame } = gameStore;
const { settings } = storeToRefs(gameStore);
const $router = useRouter();
const $route = useRoute();
const { isProd } = useEnv();

const onGameDebug = () => {
  settings.value.isPlayer2AI = false;
  initGame();
  $router.push("/debug");
};
</script>

<template>
  <header class="z-[11] w-full bg-black px-4 py-2 -sm:px-0">
    <div class="mx-auto flex max-w-[1140px] items-center -lg:flex-col">
      <div class="flex w-full shrink-0 justify-between">
        <nuxt-link
          to="/"
          class="flex items-center px-4 py-2 text-xl font-extrabold uppercase text-white -sm:px-4"
        >
          gomoku
        </nuxt-link>

        <div class="mr-2 flex items-center gap-1 -sm:my-0">
          <ClientOnly>
            <MobileInfoBoard v-if="!nonGamePage && !docPage" class="lg:hidden" />
            <MobileDocs v-if="docPage" class="sm:hidden" />
          </ClientOnly>

          <Button
            icon="pi pi-wrench"
            rounded
            variant="text"
            class="!text-white hover:!text-black"
            @click="onGameDebug"
            v-if="$route.path === '/' && !isProd"
          />
        </div>
      </div>
    </div>
  </header>
</template>
