// backend/services/core/__tests__/webhookNotifier.test.js
// Testes unitários para webhookNotifier.
// Feature: async-simulation-job

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sendWebhookNotification } from '../webhookNotifier.js';

describe('sendWebhookNotification', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('retorna true para resposta 2xx', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200 });
    const result = await sendWebhookNotification('https://example.com/hook', { jobId: '123' });
    expect(result).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.com/hook',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: '123' }),
      })
    );
  });

  it('retorna false para resposta 4xx', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 404 });
    const result = await sendWebhookNotification('https://example.com/hook', {});
    expect(result).toBe(false);
  });

  it('retorna false para resposta 5xx', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500 });
    const result = await sendWebhookNotification('https://example.com/hook', {});
    expect(result).toBe(false);
  });

  it('retorna false e não lança exceção em erro de rede', async () => {
    fetchMock.mockRejectedValueOnce(new Error('Network error'));
    await expect(sendWebhookNotification('https://example.com/hook', {})).resolves.toBe(false);
  });

  it('retorna false e não lança exceção em timeout', async () => {
    fetchMock.mockRejectedValueOnce(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
    await expect(sendWebhookNotification('https://example.com/hook', {})).resolves.toBe(false);
  });

  it('loga erro sem propagar exceção', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchMock.mockRejectedValueOnce(new Error('Connection refused'));
    await sendWebhookNotification('https://example.com/hook', {});
    expect(consoleSpy).toHaveBeenCalled();
  });
});
