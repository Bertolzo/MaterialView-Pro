import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getSimulationCacheKey,
  getCachedSimulation,
  setCachedSimulation,
  getSimulationCacheStats,
  clearSimulationCache,
} from '../simulationCache.js';

describe('simulationCache', () => {
  beforeEach(() => {
    clearSimulationCache();
  });

  const image1 = 'data:image/jpeg;base64,AAAA';
  const image2 = 'data:image/jpeg;base64,BBBB';
  const material1 = { type: 'ceramic', color: 'white', dimensions: '60x60cm' };
  const material2 = { type: 'ceramic', color: 'gray', dimensions: '60x60cm' };
  const material3 = { type: 'ceramicw', color: 'hite', dimensions: '60x60cm' };

  const sampleResult = {
    editedImageBase64: 'data:image/jpeg;base64,RESULT',
    fidelity: 0.85,
    context: { geometry: { width: 4.0 } },
  };

  describe('getSimulationCacheKey', () => {
    it('produces same key for same inputs', () => {
      const key1 = getSimulationCacheKey(image1, material1);
      const key2 = getSimulationCacheKey(image1, material1);
      expect(key1).toBe(key2);
      expect(key1).toHaveLength(64); // SHA256 hex
    });

    it('produces different key for different image', () => {
      const key1 = getSimulationCacheKey(image1, material1);
      const key2 = getSimulationCacheKey(image2, material1);
      expect(key1).not.toBe(key2);
    });

    it('produces different key for different material color', () => {
      const key1 = getSimulationCacheKey(image1, material1);
      const key2 = getSimulationCacheKey(image1, material2);
      expect(key1).not.toBe(key2);
    });

    it('null byte delimiter prevents field-boundary collisions', () => {
      // material1: type="ceramic", color="white"
      // material3: type="ceramicw", color="hite"
      // Without delimiter these could collide; with \0 they should not
      const key1 = getSimulationCacheKey(image1, material1);
      const key3 = getSimulationCacheKey(image1, material3);
      expect(key1).not.toBe(key3);
    });
  });

  describe('getCachedSimulation / setCachedSimulation', () => {
    it('returns null for unknown key', () => {
      const result = getCachedSimulation('nonexistent');
      expect(result).toBeNull();
    });

    it('returns cached result after set', () => {
      const key = getSimulationCacheKey(image1, material1);
      setCachedSimulation(key, sampleResult);
      const cached = getCachedSimulation(key);

      expect(cached).not.toBeNull();
      expect(cached.editedImageBase64).toBe(sampleResult.editedImageBase64);
      expect(cached.fidelity).toBe(0.85);
      expect(cached.cachedAt).toBeTypeOf('number');
    });

    it('returns null after TTL expires', () => {
      const key = getSimulationCacheKey(image1, material1);
      setCachedSimulation(key, sampleResult);

      // Advance time past TTL (30 min default)
      const realNow = Date.now;
      Date.now = () => realNow() + 31 * 60 * 1000;
      try {
        const cached = getCachedSimulation(key);
        expect(cached).toBeNull();
      } finally {
        Date.now = realNow;
      }
    });

    it('evicts oldest entry when at max capacity', () => {
      // Set MAX_ENTRIES env is 100 by default, but we can test eviction
      // by filling the cache and checking the oldest is gone.
      // Since we can't easily change the env var mid-test, we test
      // that the eviction logic works by inserting many entries.
      const keys = [];
      for (let i = 0; i < 101; i++) {
        const mat = { type: 'type', color: `color${i}`, dimensions: 'dim' };
        const k = getSimulationCacheKey(image1, mat);
        keys.push(k);
        setCachedSimulation(k, { ...sampleResult, fidelity: i / 100 });
      }

      // The first key should have been evicted (oldest)
      expect(getCachedSimulation(keys[0])).toBeNull();
      // The last key should still be present
      const last = getCachedSimulation(keys[100]);
      expect(last).not.toBeNull();
    });
  });

  describe('getSimulationCacheStats', () => {
    it('starts with zero counts', () => {
      const stats = getSimulationCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.hitCount).toBe(0);
      expect(stats.missCount).toBe(0);
      expect(stats.hitRate).toBe(0);
    });

    it('tracks hit and miss counts', () => {
      const key = getSimulationCacheKey(image1, material1);

      // Miss
      getCachedSimulation(key);
      let stats = getSimulationCacheStats();
      expect(stats.missCount).toBe(1);
      expect(stats.hitCount).toBe(0);

      // Set then hit
      setCachedSimulation(key, sampleResult);
      getCachedSimulation(key);
      stats = getSimulationCacheStats();
      expect(stats.hitCount).toBe(1);
      expect(stats.missCount).toBe(1);
      expect(stats.hitRate).toBe(0.5);
    });

    it('reports correct size', () => {
      const key = getSimulationCacheKey(image1, material1);
      setCachedSimulation(key, sampleResult);

      const stats = getSimulationCacheStats();
      expect(stats.size).toBe(1);
      expect(stats.maxEntries).toBe(100);
      expect(stats.ttlMs).toBe(30 * 60 * 1000);
    });
  });

  describe('clearSimulationCache', () => {
    it('clears all entries and resets counters', () => {
      const key = getSimulationCacheKey(image1, material1);
      setCachedSimulation(key, sampleResult);
      getCachedSimulation(key); // hit
      getCachedSimulation('miss'); // miss

      clearSimulationCache();

      const stats = getSimulationCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.hitCount).toBe(0);
      expect(stats.missCount).toBe(0);

      // Previously cached entry is gone
      expect(getCachedSimulation(key)).toBeNull();
    });
  });
});
