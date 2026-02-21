const visible = ref(false);
const currentImage = ref<{ src: string; alt: string } | null>(null);

export function useDocsImageDialog() {
  function open(src: string, alt: string) {
    currentImage.value = { src, alt };
    visible.value = true;
  }

  function close() {
    visible.value = false;
  }

  return {
    visible: readonly(visible),
    currentImage: readonly(currentImage),
    open,
    close,
  };
}
