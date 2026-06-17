// backend/services/core/webhookNotifier.js
// Envia notificações HTTP para webhooks configurados pelos clientes.
// Usa fetch nativo do Node.js 18+. Timeout de 5s via AbortController.
// Não retenta em caso de falha — falhas são logadas e ignoradas.

/**
 * Envia uma notificação HTTP POST para a webhookUrl fornecida.
 * @param {string} webhookUrl - URL de destino (http ou https)
 * @param {object} payload - Dados a enviar como JSON
 * @returns {Promise<boolean>} true se resposta 2xx, false caso contrário
 */
export async function sendWebhookNotification(webhookUrl, payload) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`[webhookNotifier] Webhook retornou status ${response.status} para ${webhookUrl}`);
      return false;
    }

    return true;
  } catch (err) {
    clearTimeout(timeoutId);
    const reason = err.name === 'AbortError' ? 'timeout (5s)' : err.message;
    console.error(`[webhookNotifier] Falha ao notificar ${webhookUrl}: ${reason}`);
    return false;
  }
}
