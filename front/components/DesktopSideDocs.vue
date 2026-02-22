<script setup lang="ts">
import type { DocLink, DocFolder, DocItem } from "~/types/docs";
import { ACCORDION_GROUPS } from "~/stores/docs.store";
import { useRuntimeConfig } from "#imports";

const docsStore = useDocsStore();
const { docLinks, pathToGroupMap, openGroups } = storeToRefs(docsStore);
const { isGroupOpen, toggleGroup, addOpenGroup } = docsStore;
const route = useRoute();
const config = useRuntimeConfig();

/** pathToGroupMap keys are content paths (no baseURL, no trailing slash). Normalize route.path to match. */
function normalizedPathForLookup(path: string): string {
  const base = (config.app?.baseURL || "/").replace(/\/$/, "") || "";
  const withoutBase = base ? path.replace(new RegExp(`^${base}`), "") : path;
  return withoutBase.replace(/\/$/, "") || "/";
}

// openGroups만 사용. 현재 경로 그룹은 watch에서 addOpenGroup으로 이미 열리므로,
// 여기서 강제로 넣지 않아야 사용자가 아코디언을 닫을 수 있음.
const effectiveOpenGroups = computed(() =>
  new Set(openGroups.value.map((g) => g.toLowerCase())),
);

const isGroupOpenForRender = (groupName: string): boolean =>
  effectiveOpenGroups.value.has(groupName.toLowerCase());

watch(
  () => route.path,
  (path) => {
    const pathKey = normalizedPathForLookup(path);
    const groupName = pathToGroupMap.value[pathKey]?.toLowerCase();
    if (groupName && ACCORDION_GROUPS.has(groupName)) {
      addOpenGroup(groupName);
    }
  },
  { immediate: true },
);

const isFolder = (item: DocLink): item is DocFolder => {
  return "items" in item;
};

const isAccordionGroup = (groupName: string) => {
  return ACCORDION_GROUPS.has(groupName.toLowerCase());
};
</script>

<template>
  <aside class="pb-10">
    <div class="sticky top-0 z-10 flex items-center gap-2.5 border-b border-stone-200 px-4 py-3.5 bg-white">
      <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" aria-hidden="true">
        <i class="pi pi-book text-sm" />
      </span>
      <span class="text-[15px] font-bold tracking-tight">
        Documentation
      </span>
    </div>
    <div class="flex flex-col pt-2 overflow-y-auto h-[calc(100vh-60px-61px)]">
      <div class="pb-10">
      <template v-for="(item, index) in docLinks" :key="index">
        <template v-if="isFolder(item)">
          <!-- 아코디언 그룹 (Alphazero, Minimax) -->
          <div
            v-if="isAccordionGroup(item.label)"
            class="border-b border-stone-200"
          >
            <button
              @click="toggleGroup(item.label)"
              class="group-btn flex w-full items-center justify-between px-3 py-2 text-left text-sm font-bold text-stone-800 hover:bg-stone-200/80 hover:text-stone-900"
            >
              <span>{{ item.label }}</span>
              <span
                :class="`pi transition-transform ${
                  isGroupOpenForRender(item.label) ? 'pi-chevron-up' : 'pi-chevron-down'
                }`"
              />
            </button>
            <Transition name="slide-down">
              <div
                v-if="isGroupOpenForRender(item.label)"
              >
                <NuxtLink
                  v-for="(subItem, subIndex) in item.items"
                  :key="subIndex"
                  class="sidebar-link flex items-start gap-1.5 px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-200/70 hover:text-stone-900 active:bg-stone-200/80"
                  :to="subItem.url"
                >
                  <span :class="`pi ${subItem.icon} text-xs pt-[5px]`" />
                  <span>{{ subItem.label }}</span>
                </NuxtLink>
              </div>
            </Transition>
          </div>

          <!-- 일반 그룹 (아코디언 없음) -->
          <div v-else class="border-b border-stone-200">
            <div class="px-3 py-2 text-sm font-bold text-stone-800">
              {{ item.label }}
            </div>
            <div>
              <NuxtLink
                v-for="(subItem, subIndex) in item.items"
                :key="subIndex"
                class="sidebar-link flex items-start gap-1.5 pl-3 pr-2 py-1.5 text-sm text-stone-600 hover:bg-stone-200/70 hover:text-stone-900 active:bg-stone-200/80"
                :to="subItem.url"
              >
                <span :class="`pi ${subItem.icon} text-xs pt-1`" />
                <span>{{ subItem.label }}</span>
              </NuxtLink>
            </div>
          </div>
          </template>
        </template>
      </div>
    </div>
  </aside>
</template>
<style scoped>
.sidebar-link.router-link-active {
  @apply border-l-2 border-stone-700 bg-stone-200/60 font-medium text-stone-900;
}

.sidebar-link {
  @apply border-l-2 border-transparent;
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.slide-down-enter-from,
.slide-down-leave-to {
  max-height: 0;
  opacity: 0;
}

.slide-down-enter-to,
.slide-down-leave-from {
  max-height: 500px;
  opacity: 1;
}
</style>
