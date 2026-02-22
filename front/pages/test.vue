<script setup lang="ts">
definePageMeta({
  layout: "test",
  middleware: "test-health",
});

const mounted = ref(false);
onMounted(() => {
  mounted.value = true;
});
</script>

<template>
  <main class="relative">
    <TestPageClient v-if="mounted" />
    <section
      v-else
      class="flex min-h-screen flex-col items-center justify-center gap-4 px-6"
    >
      <i class="pi pi-spin pi-spinner text-4xl text-gray-400" aria-hidden="true" />
      <p class="text-gray-500">Loading test cases...</p>
    </section>
  </main>
</template>
