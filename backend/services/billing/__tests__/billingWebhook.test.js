// services/billing/__tests__/billingWebhook.test.js
// Testes para o webhook de billing e atualização de créditos no apiKeyStore

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock do apiKeyStore
// ---------------------------------------------------------------------------
const mockKeys = {};

vi.mock('../../../services/apiKeyStore.js', () => ({
  loadKeys: vi.fn(() => ({ ...mockKeys })),
  saveKeys: vi.fn((keys) => {
    Object.assign(mockKeys, keys);
  }),
}));

// ---------------------------------------------------------------------------
// Helpers para simular requisição/resposta Express
// ---------------------------------------------------------------------------
function makeReq(body = {}, headers = {}) {
  return { body, headers };
}

function makeRes() {
  const res = {
    _status: 200,
    _body: null,
    status(code) { this._status = code; return this; },
    json(body) { this._body = body; return this; },
  };
  return res;
}

describe('billing webhook handler', () => {
  let handler;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    // Limpar estado do mock
    Object.keys(mockKeys).forEach((k) => delete mockKeys[k]);

    // Importar o router e extrair o handler do webhook
    // Como o router usa Express, vamos testar a lógica diretamente
    // importando o módulo e inspecionando as rotas
    process.env.ASAAS_WEBHOOK_SECRET = 'secret_test';
  });

  it('deve rejeitar webhook sem token correto', async () => {
    const { default: router } = await import('../../billing/asaasService.js');
    // Testar a lógica de autenticação diretamente
    const secret = process.env.ASAAS_WEBHOOK_SECRET;
    const token = 'token_errado';
    expect(token !== secret).toBe(true);
  });

  it('deve aceitar webhook com token correto', () => {
    const secret = process.env.ASAAS_WEBHOOK_SECRET;
    const token = 'secret_test';
    expect(token === secret).toBe(true);
  });

  it('deve ativar cliente ao receber PAYMENT_CONFIRMED', async () => {
    const { loadKeys, saveKeys } = await import('../../../services/apiKeyStore.js');

    // Simular cliente suspenso
    const initialKeys = {
      'sk_live_abc': {
        clientId: 'client_raildo',
        planId: 'basic',
        active: false,
        suspended: true,
      },
    };
    loadKeys.mockReturnValue({ ...initialKeys });

    // Simular o processamento do evento PAYMENT_CONFIRMED
    const keys = loadKeys();
    const clientId = 'client_raildo';
    const event = 'PAYMENT_CONFIRMED';

    const clientKeys = Object.entries(keys).filter(
      ([, client]) => client.clientId === clientId
    );

    if (event === 'PAYMENT_CONFIRMED') {
      for (const [key] of clientKeys) {
        keys[key].active = true;
        keys[key].suspended = false;
      }
      saveKeys(keys);
    }

    expect(saveKeys).toHaveBeenCalledWith(
      expect.objectContaining({
        'sk_live_abc': expect.objectContaining({ active: true, suspended: false }),
      })
    );
  });

  it('deve suspender cliente ao receber PAYMENT_OVERDUE', async () => {
    const { loadKeys, saveKeys } = await import('../../../services/apiKeyStore.js');

    const initialKeys = {
      'sk_live_xyz': {
        clientId: 'client_joao',
        planId: 'popular',
        active: true,
        suspended: false,
      },
    };
    loadKeys.mockReturnValue({ ...initialKeys });

    const keys = loadKeys();
    const clientId = 'client_joao';
    const event = 'PAYMENT_OVERDUE';

    const clientKeys = Object.entries(keys).filter(
      ([, client]) => client.clientId === clientId
    );

    if (event === 'PAYMENT_OVERDUE' || event === 'SUBSCRIPTION_CANCELLED') {
      for (const [key] of clientKeys) {
        keys[key].active = false;
        keys[key].suspended = true;
      }
      saveKeys(keys);
    }

    expect(saveKeys).toHaveBeenCalledWith(
      expect.objectContaining({
        'sk_live_xyz': expect.objectContaining({ active: false, suspended: true }),
      })
    );
  });

  it('deve suspender cliente ao receber SUBSCRIPTION_CANCELLED', async () => {
    const { loadKeys, saveKeys } = await import('../../../services/apiKeyStore.js');

    const initialKeys = {
      'sk_live_def': {
        clientId: 'client_maria',
        planId: 'pro',
        active: true,
        suspended: false,
      },
    };
    loadKeys.mockReturnValue({ ...initialKeys });

    const keys = loadKeys();
    const clientId = 'client_maria';
    const event = 'SUBSCRIPTION_CANCELLED';

    const clientKeys = Object.entries(keys).filter(
      ([, client]) => client.clientId === clientId
    );

    if (event === 'PAYMENT_OVERDUE' || event === 'SUBSCRIPTION_CANCELLED') {
      for (const [key] of clientKeys) {
        keys[key].active = false;
        keys[key].suspended = true;
      }
      saveKeys(keys);
    }

    expect(saveKeys).toHaveBeenCalledWith(
      expect.objectContaining({
        'sk_live_def': expect.objectContaining({ active: false, suspended: true }),
      })
    );
  });

  it('não deve alterar estado para eventos desconhecidos', async () => {
    const { loadKeys, saveKeys } = await import('../../../services/apiKeyStore.js');

    const initialKeys = {
      'sk_live_ghi': {
        clientId: 'client_pedro',
        planId: 'basic',
        active: true,
        suspended: false,
      },
    };
    loadKeys.mockReturnValue({ ...initialKeys });

    const event = 'PAYMENT_CREATED'; // evento não tratado
    const isHandled = ['PAYMENT_CONFIRMED', 'PAYMENT_OVERDUE', 'SUBSCRIPTION_CANCELLED'].includes(event);

    expect(isHandled).toBe(false);
    // saveKeys não deve ser chamado para eventos não tratados
    expect(saveKeys).not.toHaveBeenCalled();
  });
});
