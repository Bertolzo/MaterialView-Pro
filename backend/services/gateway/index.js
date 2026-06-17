import { ProviderRouter } from './ProviderRouter.js';
import { buildProviders } from './providers/index.js';

const router = new ProviderRouter(buildProviders());

export async function requestSimulation(imageBase64, material, context) {
  return router.route(imageBase64, material, context);
}

export function resetCredits(providerId) {
  return router.resetCredits(providerId);
}

export function getMetrics() {
  return router.getMetrics();
}
