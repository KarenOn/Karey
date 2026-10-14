type ServicePrice = { price?: unknown | null };
type ServiceDuration = { durationMins?: unknown | null; isActive?: unknown };

export function countActiveServicesWithoutDuration(services: readonly ServiceDuration[]) {
  return services.filter((service) => {
    if (service.isActive !== true) return false;
    const duration = service.durationMins;
    return typeof duration !== "number" || !Number.isFinite(duration) || duration <= 0;
  }).length;
}

export function calculateAverageServicePrice(services: readonly ServicePrice[]) {
  if (services.length === 0) return 0;

  const total = services.reduce((sum, service) => {
    const price = Number(service.price ?? 0);
    return sum + (Number.isFinite(price) ? price : 0);
  }, 0);

  return total / services.length;
}
