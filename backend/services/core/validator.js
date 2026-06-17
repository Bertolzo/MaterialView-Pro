// backend/services/core/validator.js
// Arquitetura "gerador-verificador" inspirada em "Talk Less, Verify More" (2026).
// Verificadores semânticos retornam scores contínuos [0.0, 1.0].
// violated = true quando score < threshold.
//
// Implementação: análise de pixels via Buffer (Node.js nativo).
// Cache em memória: evita reprocessamento do mesmo par de imagens (TTL 5min).
// Próximo passo: substituir por CLIP via Replicate (~$0.001/validação).

import { createHash } from 'crypto';

const INVARIANT_THRESHOLDS = {
  shadows: 0.70,
  geometry: 0.80,
  objects: 0.75,
  perspective: 0.85,
};

// Cache de resultados de validação: hash → { result, expiresAt }
const validationCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

function getCacheKey(originalImageBase64, editedImageBase64) {
  return createHash('sha256')
    .update(originalImageBase64.slice(0, 200) + editedImageBase64.slice(0, 200))
    .digest('hex');
}

function getCached(key) {
  const entry = validationCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    validationCache.delete(key);
    return null;
  }
  return entry.result;
}

function setCache(key, result) {
  validationCache.set(key, { result, expiresAt: Date.now() + CACHE_TTL_MS });
  // Limpa entradas expiradas periodicamente (evita memory leak)
  if (validationCache.size > 500) {
    const now = Date.now();
    for (const [k, v] of validationCache.entries()) {
      if (now > v.expiresAt) validationCache.delete(k);
    }
  }
}

function toBuffer(imageBase64) {
  const clean = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
  return Buffer.from(clean, 'base64');
}

function luminanceHistogram(buf) {
  const hist = new Float32Array(256).fill(0);
  const step = Math.max(1, Math.floor(buf.length / 4096));
  let count = 0;
  for (let i = 0; i < buf.length; i += step) {
    hist[buf[i]]++;
    count++;
  }
  if (count > 0) {
    for (let i = 0; i < 256; i++) hist[i] /= count;
  }
  return hist;
}

function bhattacharyyaDistance(h1, h2) {
  let bc = 0;
  for (let i = 0; i < 256; i++) {
    bc += Math.sqrt(h1[i] * h2[i]);
  }
  const dist = bc > 0 ? -Math.log(Math.min(bc, 1)) : 1;
  return Math.min(1, dist / 3);
}

function checkShadows(origBuf, editBuf) {
  const origHist = luminanceHistogram(origBuf);
  const editHist = luminanceHistogram(editBuf);
  const origShadow = new Float32Array(256);
  const editShadow = new Float32Array(256);
  let origSum = 0;
  for (let i = 0; i < 80; i++) {
    origShadow[i] = origHist[i];
    editShadow[i] = editHist[i];
    origSum += origHist[i];
  }
  if (origSum < 0.05) return { score: 0.90 };
  const dist = bhattacharyyaDistance(origShadow, editShadow);
  return { score: Math.max(0, 1 - dist * 1.5) };
}

function checkGeometry(origBuf, editBuf) {
  const sizeRatio = Math.min(origBuf.length, editBuf.length) /
                    Math.max(origBuf.length, editBuf.length);
  const origHist = luminanceHistogram(origBuf);
  const editHist = luminanceHistogram(editBuf);
  const dist = bhattacharyyaDistance(origHist, editHist);
  const score = 0.4 * sizeRatio + 0.6 * Math.max(0, 1 - dist);
  return { score: Math.min(1, score * 1.1) };
}

function checkObjects(origBuf, editBuf) {
  const origHist = luminanceHistogram(origBuf);
  const editHist = luminanceHistogram(editBuf);
  const origMid = new Float32Array(256);
  const editMid = new Float32Array(256);
  for (let i = 80; i < 200; i++) {
    origMid[i] = origHist[i];
    editMid[i] = editHist[i];
  }
  const dist = bhattacharyyaDistance(origMid, editMid);
  return { score: Math.max(0, 1 - dist * 1.2) };
}

function checkPerspective(origBuf, editBuf) {
  const origHist = luminanceHistogram(origBuf);
  const editHist = luminanceHistogram(editBuf);
  const origLight = new Float32Array(256);
  const editLight = new Float32Array(256);
  let origSum = 0;
  for (let i = 200; i < 256; i++) {
    origLight[i] = origHist[i];
    editLight[i] = editHist[i];
    origSum += origHist[i];
  }
  if (origSum < 0.03) return { score: 0.88 };
  const dist = bhattacharyyaDistance(origLight, editLight);
  return { score: Math.max(0, 1 - dist * 1.3) };
}

/**
 * Executa as quatro verificações de invariante de forma independente.
 * Usa cache em memória para evitar reprocessamento do mesmo par de imagens.
 */
export async function validateInvariants(originalImageBase64, editedImageBase64, _context) {
  if (!originalImageBase64 || !editedImageBase64) {
    return {
      violated: true,
      invariant: 'input',
      description: 'Imagem original ou editada ausente',
      scores: { shadows: 0, geometry: 0, objects: 0, perspective: 0 },
      overallScore: 0,
    };
  }

  // Verifica cache antes de processar
  const cacheKey = getCacheKey(originalImageBase64, editedImageBase64);
  const cached = getCached(cacheKey);
  if (cached) return cached;

  let origBuf, editBuf;
  try {
    origBuf = toBuffer(originalImageBase64);
    editBuf = toBuffer(editedImageBase64);
  } catch {
    return {
      violated: true,
      invariant: 'input',
      description: 'Falha ao decodificar imagem base64',
      scores: { shadows: 0, geometry: 0, objects: 0, perspective: 0 },
      overallScore: 0,
    };
  }

  const [shadowResult, geometryResult, objectsResult, perspectiveResult] =
    await Promise.all([
      Promise.resolve(checkShadows(origBuf, editBuf)),
      Promise.resolve(checkGeometry(origBuf, editBuf)),
      Promise.resolve(checkObjects(origBuf, editBuf)),
      Promise.resolve(checkPerspective(origBuf, editBuf)),
    ]);

  const scores = {
    shadows: shadowResult.score,
    geometry: geometryResult.score,
    objects: objectsResult.score,
    perspective: perspectiveResult.score,
  };

  const overallScore = (scores.shadows + scores.geometry + scores.objects + scores.perspective) / 4;

  const checks = ['shadows', 'geometry', 'objects', 'perspective'];
  for (const name of checks) {
    const threshold = INVARIANT_THRESHOLDS[name];
    if (scores[name] < threshold) {
      const result = {
        violated: true,
        invariant: name,
        description: `Invariante '${name}' violada: score ${scores[name].toFixed(2)} abaixo do threshold ${threshold}`,
        scores,
        overallScore,
      };
      setCache(cacheKey, result);
      return result;
    }
  }

  const result = { violated: false, scores, overallScore };
  setCache(cacheKey, result);
  return result;
}
