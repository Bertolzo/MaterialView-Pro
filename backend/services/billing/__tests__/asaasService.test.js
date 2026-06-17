// services/billing/__tests__/asaasService.test.js
// Testes unitários para o serviço Asaas (com mocks da API HTTP)

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock global fetch
// ---------------------------------------------------------------------------
function mockFetch(responseBody, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => responseBody,
  });
}

describe('asaasService', () => {
  let createCustomer, createSubscription, getSubscriptionPaymentLink;

  beforeEach(async () => {
    // Configurar variáveis de ambiente para os testes
    process.env.ASAAS_API_KEY = 'test_key';
    process.env.ASAAS_BASE_URL = 'https://sandbox.asaas.com/api/v3';

    // Re-importar o módulo a cada teste para garantir estado limpo
    vi.resetModules();
    const mod = await import('../asaasService.js');
    createCustomer = mod.createCustomer;
    createSubscription = mod.createSubscription;
    getSubscriptionPaymentLink = mod.getSubscriptionPaymentLink;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // createCustomer
  // -------------------------------------------------------------------------
  describe('createCustomer', () => {
    it('deve criar cliente com os campos corretos', async () => {
      const mockCustomer = { id: 'cus_123', name: 'João Silva', email: 'joao@loja.com' };
      global.fetch = mockFetch(mockCustomer);

      const result = await createCustomer({
        name: 'João Silva',
        email: 'joao@loja.com',
        cpfCnpj: '12345678000195',
        phone: '11999999999',
      });

      expect(result).toEqual(mockCustomer);
      expect(global.fetch).toHaveBeenCalledOnce();

      const [url, options] = global.fetch.mock.calls[0];
      expect(url).toContain('/customers');
      expect(options.method).toBe('POST');

      const body = JSON.parse(options.body);
      expect(body.name).toBe('João Silva');
      expect(body.email).toBe('joao@loja.com');
      expect(body.cpfCnpj).toBe('12345678000195');
      expect(body.mobilePhone).toBe('11999999999');
    });

    it('deve criar cliente sem telefone quando não fornecido', async () => {
      global.fetch = mockFetch({ id: 'cus_456', name: 'Maria', email: 'maria@loja.com' });

      await createCustomer({ name: 'Maria', email: 'maria@loja.com', cpfCnpj: '98765432100' });

      const [, options] = global.fetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.mobilePhone).toBeUndefined();
    });

    it('deve lançar erro quando a API retorna status de erro', async () => {
      global.fetch = mockFetch(
        { errors: [{ description: 'CPF/CNPJ inválido' }] },
        400
      );

      await expect(
        createCustomer({ name: 'X', email: 'x@x.com', cpfCnpj: '000' })
      ).rejects.toThrow('CPF/CNPJ inválido');
    });
  });

  // -------------------------------------------------------------------------
  // createSubscription
  // -------------------------------------------------------------------------
  describe('createSubscription', () => {
    it.each([
      ['trial', 0],
      ['basic', 197],
      ['popular', 347],
      ['pro', 597],
      ['enterprise', 1497],
    ])('deve criar assinatura para plano %s com valor R$ %d', async (plan, expectedValue) => {
      const mockSub = { id: `sub_${plan}`, status: 'ACTIVE', value: expectedValue };
      global.fetch = mockFetch(mockSub);

      const result = await createSubscription({ customerId: 'cus_123', plan });

      expect(result).toEqual(mockSub);

      const [, options] = global.fetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.value).toBe(expectedValue);
      expect(body.cycle).toBe('MONTHLY');
      expect(body.externalReference).toBe(plan);
    });

    it('deve definir maxPayments: 1 para o plano trial', async () => {
      global.fetch = mockFetch({ id: 'sub_trial', status: 'ACTIVE', value: 0 });

      await createSubscription({ customerId: 'cus_123', plan: 'trial' });

      const [, options] = global.fetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.maxPayments).toBe(1);
    });

    it('não deve definir maxPayments para planos pagos', async () => {
      global.fetch = mockFetch({ id: 'sub_basic', status: 'ACTIVE', value: 197 });

      await createSubscription({ customerId: 'cus_123', plan: 'basic' });

      const [, options] = global.fetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.maxPayments).toBeUndefined();
    });

    it('deve lançar erro para plano inválido', async () => {
      await expect(
        createSubscription({ customerId: 'cus_123', plan: 'inexistente' })
      ).rejects.toThrow('Plano inválido: inexistente');
    });

    it('deve lançar erro quando a API retorna erro', async () => {
      global.fetch = mockFetch({ message: 'Customer not found' }, 404);

      await expect(
        createSubscription({ customerId: 'cus_invalido', plan: 'basic' })
      ).rejects.toThrow('Customer not found');
    });
  });

  // -------------------------------------------------------------------------
  // getSubscriptionPaymentLink
  // -------------------------------------------------------------------------
  describe('getSubscriptionPaymentLink', () => {
    it('deve retornar a URL do link de pagamento', async () => {
      global.fetch = mockFetch({ url: 'https://checkout.asaas.com/pay/sub_123' });

      const link = await getSubscriptionPaymentLink('sub_123');

      expect(link).toBe('https://checkout.asaas.com/pay/sub_123');
    });

    it('deve aceitar campo paymentLink como alternativa', async () => {
      global.fetch = mockFetch({ paymentLink: 'https://checkout.asaas.com/pay/sub_456' });

      const link = await getSubscriptionPaymentLink('sub_456');

      expect(link).toBe('https://checkout.asaas.com/pay/sub_456');
    });

    it('deve retornar string vazia se nenhum campo de link estiver presente', async () => {
      global.fetch = mockFetch({ id: 'sub_789' });

      const link = await getSubscriptionPaymentLink('sub_789');

      expect(link).toBe('');
    });
  });
});
