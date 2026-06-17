// frontend/src/api/client.js
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export function simulate(imageBase64, material) {
  return fetch(`${BASE_URL}/v1/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64, material }),
  });
}

export function analyze(imageBase64) {
  return fetch(`${BASE_URL}/v1/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64 }),
  });
}
