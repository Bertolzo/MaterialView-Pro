// backend/routes/billing.js
// Rotas de billing integradas com o gateway Asaas

import { Router } from 'express';
import {
  createCustomer,
  createSubscription,
  getSubscriptionPaymentLink,
} from '../services/billing/asaasService.js';
import { loadKeys, saveKeys } from '../services/apiKeyStore.js';

const router = Router();

// ---------------------------------------------------------------------------
// POST /v1/billing/subscribe
// Cria cliente e assinatura no Asaas, retorna link de checkout
// ---------------------------------------------------------------------------
router.post('/subscribe', async (req, res, next) => {
  try {
    const { name, email, cpfCnpj, phone, plan, ref } = req.body;

    if (!name || !email || !cpfCnpj || !plan) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Campos obrigatórios: name, email, cpfCnpj, plan.',
      });
    }

    const customer = await createCustomer({ name, email, cpfCnpj, phone });
    const subscription = await createSubscription({ customerId: customer.id, plan });
    const paymentLink = await getSubscriptionPaymentLink(subscription.id);

    if (ref && typeof ref === 'string') {
      const keys = loadKeys();
      const clientEntry = Object.entries(keys).find(([, c]) => c.email === email);
      if (clientEntry) {
        const [key] = clientEntry;
        keys[key].referredBy = ref.trim();
        saveKeys(keys);
      }
    }

    return res.status(201).json({
      subscriptionId: subscription.id,
      paymentLink,
      plan,
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /v1/billing/webhook
// Recebe eventos do Asaas e atualiza status do cliente
// ---------------------------------------------------------------------------
router.post('/webhook', (req, res) => {
  const token = req.headers['asaas-access-token'];
  const secret = process.env.ASAAS_WEBHOOK_SECRET;

  // Em produção, ASAAS_WEBHOOK_SECRET é obrigatório.
  // Em desenvolvimento (NODE_ENV !== 'production'), permite ausência do secret para testes locais.
  const isProd = process.env.NODE_ENV === 'production';

  if (isProd && !secret) {
    console.error('[billing/webhook] ASAAS_WEBHOOK_SECRET não definido em produção. Rejeitando requisição.');
    return res.status(500).json({ error: 'Webhook não configurado corretamente.' });
  }

  if (secret && token !== secret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { event, payment } = req.body;

  if (!event || !payment) {
    return res.status(400).json({ error: 'Payload inválido' });
  }

  const clientId = payment.externalReference || payment.subscription;

  if (!clientId) {
    return res.status(200).json({ ok: true, skipped: true });
  }

  const keys = loadKeys();
  const clientKeys = Object.entries(keys).filter(([, client]) => client.clientId === clientId);

  if (event === 'PAYMENT_CONFIRMED') {
    for (const [key] of clientKeys) {
      keys[key].active = true;
      keys[key].suspended = false;
      keys[key].lastPaymentDate = new Date().toISOString();
    }
    saveKeys(keys);
    return res.status(200).json({ ok: true, event, clientId, action: 'activated' });
  }

  if (event === 'PAYMENT_OVERDUE' || event === 'SUBSCRIPTION_CANCELLED') {
    for (const [key] of clientKeys) {
      keys[key].active = false;
      keys[key].suspended = true;
    }
    saveKeys(keys);
    return res.status(200).json({ ok: true, event, clientId, action: 'suspended' });
  }

  return res.status(200).json({ ok: true, event, skipped: true });
});

export default router;
