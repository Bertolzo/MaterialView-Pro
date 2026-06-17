// services/billing/asaasService.js
// Integração com a API de assinaturas do Asaas
// Documentação: https://docs.asaas.com/reference/criar-nova-assinatura

const PLAN_VALUES = {
  trial: 0,
  basic: 197,
  popular: 347,
  pro: 597,
  enterprise: 1497,
};

function getBaseUrl() {
  return process.env.ASAAS_BASE_URL || 'https://sandbox.asaas.com/api/v3';
}

function getApiKey() {
  return process.env.ASAAS_API_KEY || '';
}

function asaasHeaders() {
  return {
    'Content-Type': 'application/json',
    'access_token': getApiKey(),
  };
}

async function asaasRequest(method, path, body) {
  const url = `${getBaseUrl()}${path}`;
  const options = {
    method,
    headers: asaasHeaders(),
  };
  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url, options);
  const data = await res.json();

  if (!res.ok) {
    const message = data?.errors?.[0]?.description || data?.message || `Asaas error ${res.status}`;
    throw new Error(message);
  }

  return data;
}

/**
 * Cria um cliente no Asaas.
 * @param {{ name: string, email: string, cpfCnpj: string, phone?: string }} params
 * @returns {Promise<{ id: string, name: string, email: string }>}
 */
export async function createCustomer({ name, email, cpfCnpj, phone }) {
  return asaasRequest('POST', '/customers', {
    name,
    email,
    cpfCnpj,
    ...(phone ? { mobilePhone: phone } : {}),
  });
}

/**
 * Cria uma assinatura recorrente no Asaas.
 * @param {{ customerId: string, plan: string }} params
 * @returns {Promise<{ id: string, status: string, value: number }>}
 */
export async function createSubscription({ customerId, plan }) {
  const value = PLAN_VALUES[plan];
  if (value === undefined) {
    throw new Error(`Plano inválido: ${plan}. Planos válidos: ${Object.keys(PLAN_VALUES).join(', ')}`);
  }

  const body = {
    customer: customerId,
    billingType: 'UNDEFINED',
    value,
    cycle: 'MONTHLY',
    externalReference: plan,
  };

  if (plan === 'trial') {
    body.maxPayments = 1;
  }

  return asaasRequest('POST', '/subscriptions', body);
}

/**
 * Retorna o link de checkout hospedado do Asaas para uma assinatura.
 * @param {string} subscriptionId
 * @returns {Promise<string>} URL do checkout
 */
export async function getSubscriptionPaymentLink(subscriptionId) {
  const data = await asaasRequest('GET', `/subscriptions/${subscriptionId}/paymentLink`);
  return data.url || data.paymentLink || data.invoiceUrl || '';
}
