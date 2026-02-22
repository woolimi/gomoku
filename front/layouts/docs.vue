<script setup lang="ts">
useHead({
  link: [
    {
      rel: "stylesheet",
      href: "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css",
    },
  ],
});
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <header class="fixed top-0 left-0 right-0 z-[11]">
      <MHeader doc-page class="w-full" />
    </header>
    <main class="flex-1 pt-[60px]">
      <slot />
    </main>
    <MFooter class="w-full shrink-0" />
    <ClientOnly>
      <DocsImageDialog />
    </ClientOnly>
  </div>
</template>
