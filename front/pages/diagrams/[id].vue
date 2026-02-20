<template>
  <div class="standalone-diagram-page">
    <component :is="activeComponent" v-if="activeComponent" />
    <div v-else class="error-msg">
      Diagram not found: {{ diagramId }}
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
// Import diagram components explicitly (or let Nuxt auto-import handle it if configured globally, but explicit is safer here for dynamic resolution)
import Diagram03 from '~/components/diagrams/Diagram03.vue';
import Diagram04 from '~/components/diagrams/Diagram04.vue';
import Diagram09 from '~/components/diagrams/Diagram09.vue';
import Diagram10 from '~/components/diagrams/Diagram10.vue';

const route = useRoute();
const diagramId = computed(() => String(route.params.id ?? ''));

const componentMap = {
  'diagram_03': Diagram03,
  'diagram_04': Diagram04,
  'diagram_09': Diagram09,
  'diagram_10': Diagram10,
};

const activeComponent = computed(() => componentMap[diagramId.value]);

// Setup minimal metadata for standalone view
definePageMeta({
  layout: false
});

useHead(() => ({
  title: `Diagram ${diagramId.value}`,
  bodyAttrs: {
    class: 'overflow-hidden m-0 p-0 bg-[#f8fafc]'
  }
}));
</script>

<style scoped>
.standalone-diagram-page {
  min-height: 100vh;
  width: 100vw;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f8fafc;
  margin: 0;
  padding: 0;
}

.standalone-diagram-page :deep(.diagram-wrapper) {
  width: 100%;
  max-width: 100%;
  height: 100vh;
  padding: 2vw;
  box-sizing: border-box;
}

.standalone-diagram-page :deep(svg) {
  max-height: 80vh;
  width: auto;
  margin: 0 auto;
}

.error-msg {
  color: #dc2626;
  font-weight: 600;
  font-size: 1.2rem;
}
</style>
