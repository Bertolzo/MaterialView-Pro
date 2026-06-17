// backend/services/core/simulationCache.js
// Cache em memória para resultados de simulação (imagem+material).
// Evita chamadas repetidas ao WaveSpeedAI para o mesmo par.
//
// Proteção OOM: entradas com editedImageBase64 > MAX_ENTRY_SIZE_BYTES são rejeitadas.
// Isso evita que imagens de alta resolução consumam toda a RAM disponível.

import { createHash } from 'crypto';

const CACHE_TTL_MS = parseInt(process.env.SIMULATION_CACHE_TTL_MS || String(30 * 60 * 1000), 10);
const MAX_ENTRIES = parseInt(process.env.SIMULATION_CACHE_MAX_ENTRIES || '100', 10);
// Limite por entrada: padrão 2MB (base64 de ~1.5MB de imagem JPEG)
const MAX_ENTRY_SIZE_BYTES = parseInt(process.env.SIMULATION_CACHE_MAX_ENTRY_BYTES || String(2 * 1024 * 1024), 10);

const simulationCache = new Map();
let hitCount = 0;
let missCount = 0;
let evictedCount = 0;

/**
 * Gera chave de cache SHA256 a partir da imagem e material.
 * Usa delimitadores null byte para evitar colisões entre campos.
 */
export function getSimulationCacheKey(imageBase64, material) {
  return createHash('sha256')
    .update(imageBase64)
    .update('\0')
    .update(material.type)
    .update('\0')
    .update(material.color)
    .update('\0')
    .update(material.dimensions)
    .digest('hex');
}

/**
 * Estima o tamanho em bytes de um resultado de simulação.
 * Considera apenas editedImageBase64 que é o campo dominante.
 */
function estimateResultSize(result) {
  const img = result?.editedImageBase64;
  if (!img || typeof img !== 'string') return 0;
  // Base64: ~4/3 do tamanho original, mas aqui medimos o tamanho da string em bytes
  return Buffer.byteLength(img, 'utf8');
}

/**
 * Retorna resultado cacheado ou null.
 * Remove entradas expiradas automaticamente.
 */
export function getCachedSimulation(key) {
  if (CACHE_TTL_MS <= 0 || MAX_ENTRIES <= 0) {
    missCount++;
    return null;
  }

  const entry = simulationCache.get(key);
  if (!entry) {
    missCount++;
    return null;
  }

  if (Date.now() > entry.expiresAt) {
    simulationCache.delete(key);
    missCount++;
    return null;
  }

  hitCount++;
  return { ...entry.result, cachedAt: entry.cachedAt };
}

/**
 * Armazena resultado de simulação no cache.
 * Rejeita entradas que excedam MAX_ENTRY_SIZE_BYTES para evitar OOM.
 * Executa evição quando o cache atinge capacidade máxima.
 */
export function setCachedSimulation(key, result) {
  if (CACHE_TTL_MS <= 0 || MAX_ENTRIES <= 0) return;

  // Proteção OOM: rejeita entradas muito grandes
  const entrySize = estimateResultSize(result);
  if (MAX_ENTRY_SIZE_BYTES > 0 && entrySize > MAX_ENTRY_SIZE_BYTES) {
    console.warn(
      `[simulationCache] Entrada rejeitada: tamanho ${Math.round(entrySize / 1024)}KB excede limite de ${Math.round(MAX_ENTRY_SIZE_BYTES / 1024)}KB`
    );
    return;
  }

  if (simulationCache.size >= MAX_ENTRIES) {
    // Primeiro: remover entradas expiradas
    const now = Date.now();
    for (const [k, v] of simulationCache.entries()) {
      if (now > v.expiresAt) {
        simulationCache.delete(k);
        evictedCount++;
      }
    }

    // Se ainda na capacidade: remover a mais antiga (LRU simples)
    if (simulationCache.size >= MAX_ENTRIES) {
      let oldestKey = null;
      let oldestTime = Infinity;
      for (const [k, v] of simulationCache.entries()) {
        if (v.cachedAt < oldestTime) {
          oldestTime = v.cachedAt;
          oldestKey = k;
        }
      }
      if (oldestKey) {
        simulationCache.delete(oldestKey);
        evictedCount++;
      }
    }
  }

  const now = Date.now();
  simulationCache.set(key, {
    result,
    cachedAt: now,
    expiresAt: now + CACHE_TTL_MS,
    sizeBytes: entrySize,
  });
}

/**
 * Retorna estatísticas do cache para o endpoint de métricas admin.
 */
export function getSimulationCacheStats() {
  const total = hitCount + missCount;

  // Calcula uso total de memória estimado
  let totalSizeBytes = 0;
  for (const entry of simulationCache.values()) {
    totalSizeBytes += entry.sizeBytes || 0;
  }

  return {
    size: simulationCache.size,
    maxEntries: MAX_ENTRIES,
    ttlMs: CACHE_TTL_MS,
    maxEntrySizeBytes: MAX_ENTRY_SIZE_BYTES,
    estimatedMemoryMB: +(totalSizeBytes / (1024 * 1024)).toFixed(2),
    hitCount,
    missCount,
    evictedCount,
    hitRate: total > 0 ? +(hitCount / total).toFixed(4) : 0,
  };
}

/**
 * Limpa o cache e reseta contadores. Para testes e admin.
 */
export function clearSimulationCache() {
  simulationCache.clear();
  hitCount = 0;
  missCount = 0;
  evictedCount = 0;
}
