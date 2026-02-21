<script setup lang="ts">
const route = useRoute();
const { showSettings, showAiSelectModal } = storeToRefs(useGameStore());
const { fetchDocLinks } = useDocsStore();

await callOnce(fetchDocLinks);

const isDocs = computed(() => route.path.startsWith("/docs"));
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
    <AlertModal />
    <MaintenanceModal v-if="!isDocs" />
    <SettingModal v-model:visible="showSettings" />
    <AiSelectModal v-if="!isDocs" v-model:visible="showAiSelectModal" />
  </NuxtLayout>
</template>
