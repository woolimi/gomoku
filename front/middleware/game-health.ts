export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return;

  if (to.path !== "/game" && to.path !== "/game/") return;

  const { settings } = storeToRefs(useGameStore());
  if (!settings.value.isPlayer2AI) return;

  const ok = await useBackendHealth().check(settings.value.ai);
  if (!ok) {
    useMaintenanceStore().forceMaintenance();
    return navigateTo("/", { replace: true });
  }
});
