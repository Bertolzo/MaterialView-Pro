// backend/services/planConfig.js
// Configuração de créditos por plano.

export const PLAN_CREDITS = {
  trial: 50,
  basic: 200,
  popular: 500,
  pro: 1000,
  enterprise: 3000,
};

export function getCreditsForPlan(plan) {
  return PLAN_CREDITS[plan] ?? 0;
}
