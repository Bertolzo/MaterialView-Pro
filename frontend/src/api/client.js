const BASE_URL = import.meta.env.VITE_API_BASE_URL;

function getApiKey() {
  return localStorage.getItem('materialview_api_key')
    || localStorage.getItem('pisosrealview_api_key')
    || '';
}

function generateIdempotencyKey() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
      });
}

function defaultHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  const apiKey = getApiKey();
  if (apiKey) headers['x-api-key'] = apiKey;
  headers['idempotency-key'] = generateIdempotencyKey();
  return headers;
}

export function simulate(imageBase64, material) {
  return fetch(`${BASE_URL}/v1/simulate`, {
    method: 'POST',
    headers: defaultHeaders(),
    body: JSON.stringify({ imageBase64, material }),
  });
}

export function analyze(imageBase64) {
  return fetch(`${BASE_URL}/v1/analyze`, {
    method: 'POST',
    headers: defaultHeaders(),
    body: JSON.stringify({ imageBase64 }),
  });
}
