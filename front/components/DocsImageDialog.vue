<template>
  <Dialog
    :visible="visible"
    modal
    dismissable-mask
    close-on-escape
    class="docs-image-dialog w-[90vw] max-w-4xl overflow-hidden !p-0 [&_.p-dialog-content]:!overflow-hidden [&_.p-dialog-content]:!p-0"
    @update:visible="(v) => !v && close()"
    @hide="close"
  >
    <div
      v-if="currentImage"
      class="flex max-h-[85vh] items-center justify-center p-4"
      @click.stop
    >
      <img
        :src="currentImage.src"
        :alt="currentImage.alt"
        class="max-h-[80vh] w-auto max-w-full object-contain"
        loading="lazy"
      />
    </div>
  </Dialog>
</template>

<script setup lang="ts">
const { visible, currentImage, close } = useDocsImageDialog();
</script>

<style scoped>
</style>
<style>
.p-dialog-mask:has(+ .docs-image-dialog.p-dialog) {
  background-color: rgba(0, 0, 0, 0.85);
}
.docs-image-dialog .p-dialog-header {
  --p-dialog-header-padding: 0.5rem;
}
.docs-image-dialog .p-dialog-header button,
.docs-image-dialog .p-dialog-header-close,
.docs-image-dialog .p-dialog-header-icons .p-button {
  width: 1.75rem !important;
  height: 1.75rem !important;
  min-width: 1.75rem !important;
  font-size: 0.75rem !important;
  padding: 0 !important;
}
</style>
