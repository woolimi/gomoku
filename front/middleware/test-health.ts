export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return;

  if (to.path !== "/test" && to.path !== "/test/") return;

  const ok = await useBackendHealth().check("minimax");
  if (!ok) {
    useMaintenanceStore().forceMaintenance();
    return navigateTo("/", { replace: true });
  }
});
