<script setup lang="ts">
const route = useRoute();
const { showSettings } = storeToRefs(useGameStore());
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
  </NuxtLayout>
</template>
