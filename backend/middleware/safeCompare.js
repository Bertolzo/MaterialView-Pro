// backend/middleware/safeCompare.js
// Helper de comparação em tempo constante para prevenir timing attacks.
// Usa crypto.timingSafeEqual do Node.js nativo.

import { timingSafeEqual } from 'crypto';

/**
 * Compara duas strings em tempo constante para prevenir timing attacks.
 * Retorna false para qualquer valor falsy sem lançar exceção.
 * @param {string|null|undefined} a
 * @param {string|null|undefined} b
 * @returns {boolean}
 */
export function safeCompare(a, b) {
  if (!a || !b) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
