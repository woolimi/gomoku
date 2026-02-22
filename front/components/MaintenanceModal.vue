<script setup lang="ts">
const maintenance = useMaintenanceStore();
const { showMaintenance } = storeToRefs(useMaintenanceStore());

const onClose = () => {
  maintenance.setMaintenance(false);
};
</script>

<template>
  <Dialog
    :visible="showMaintenance"
    modal
    :draggable="false"
    closable
    close-on-escape
    dismissable-mask
    header="Under maintenance"
    :style="{ width: '90vw', maxWidth: '420px' }"
    class="maintenance-dialog bg-white"
    pt:mask:class="backdrop-blur-sm"
    @update:visible="(v: boolean) => !v && onClose()"
  >
    <section class="flex flex-col items-center pb-1 pt-2">
      <div
        class="mb-5 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gray-100"
      >
        <i class="pi pi-wrench text-2xl text-black" aria-hidden="true" />
      </div>
      <p class="text-center text-[15px] leading-relaxed text-gray-700">
        One or more game backends are temporarily unavailable. Please try again later.
      </p>
      <div class="mt-6 w-full pt-5">
        <Button
          label="Close"
          class="w-full bg-black font-medium text-white hover:bg-gray-800"
          @click="onClose"
        />
      </div>
    </section>
  </Dialog>
</template>
