// backend/services/ai/roomAnalyzer.js
import crypto from 'crypto';

// Cache em memória: sha256 → { context, expiresAt }
const contextCache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutos

/**
 * Analisa a imagem e retorna um RoomContext.
 * Usa cache em memória com TTL de 10 minutos para evitar chamadas repetidas.
 * @param {string} imageBase64
 * @returns {Promise<object>} RoomContext
 */
export async function analyzeRoom(imageBase64) {
  const hash = crypto.createHash('sha256').update(imageBase64).digest('hex');

  // Verificar cache
  const cached = contextCache.get(hash);
  if (cached && Date.now() < cached.expiresAt) {
    console.log(`[RoomAnalyzer] Cache hit para imagem ${hash.slice(0, 8)}...`);
    return cached.context;
  }

  // Chamar provedor (WaveSpeedAI ou fallback)
  const context = await fetchRoomContext(imageBase64);

  // Armazenar em cache
  contextCache.set(hash, { context, expiresAt: Date.now() + CACHE_TTL_MS });
  console.log(`[RoomAnalyzer] Contexto armazenado em cache para ${hash.slice(0, 8)}...`);

  return context;
}

async function fetchRoomContext(imageBase64) {
  // TODO: integrar com WaveSpeedAI para análise real do ambiente
  // Por ora, retorna contexto estimado (fallback)
  return {
    geometry: { width: 4.0, height: 2.7, depth: 3.0 },
    lighting: { direction: 'unknown', intensity: 0.5 },
    objects: [],
    perspective: 'unknown',
    estimatedByFallback: true,
  };
}

// Utilitário para limpar cache expirado (chamado periodicamente)
export function clearExpiredCache() {
  const now = Date.now();
  for (const [key, value] of contextCache.entries()) {
    if (now >= value.expiresAt) {
      contextCache.delete(key);
    }
  }
}
