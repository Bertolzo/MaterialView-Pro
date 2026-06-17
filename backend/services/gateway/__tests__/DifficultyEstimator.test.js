import { describe, it, expect } from 'vitest';
import { estimateDifficulty, getMinCostTierForDifficulty } from '../DifficultyEstimator.js';

const smallImage = 'a'.repeat(100_000);   // ~75KB
const mediumImage = 'a'.repeat(400_000);  // ~300KB
const largeImage = 'a'.repeat(1_000_000); // ~750KB

const simpleMaterial = { type: 'porcelain', color: 'white', dimensions: '60x60cm' };
const complexMaterial = { type: 'marble', color: 'veined-gray', dimensions: '120x40cm' };

const emptyContext = { objects: [], lighting: { direction: 'top-left', intensity: 0.8 } };
const complexContext = {
  objects: ['sofa', 'table', 'chair', 'lamp', 'rug', 'bookshelf'],
  lighting: { direction: 'unknown', intensity: 0.5 },
};

describe('DifficultyEstimator', () => {
  describe('estimateDifficulty', () => {
    it('classifies small image + simple material + empty context as low', () => {
      const { difficulty } = estimateDifficulty(smallImage, simpleMaterial, emptyContext);
      expect(difficulty).toBe('low');
    });

    it('classifies large image as at least medium', () => {
      const { difficulty } = estimateDifficulty(largeImage, simpleMaterial, emptyContext);
      expect(['medium', 'high']).toContain(difficulty);
    });

    it('classifies complex scene (many objects + unknown lighting) as high', () => {
      const { difficulty } = estimateDifficulty(largeImage, complexMaterial, complexContext);
      expect(difficulty).toBe('high');
    });

    it('returns reasons array with at least one entry for non-trivial inputs', () => {
      const { reasons } = estimateDifficulty(largeImage, complexMaterial, complexContext);
      expect(reasons.length).toBeGreaterThan(0);
    });

    it('score is non-negative', () => {
      const { score } = estimateDifficulty(smallImage, simpleMaterial, emptyContext);
      expect(score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getMinCostTierForDifficulty', () => {
    it('returns 0 for low difficulty', () => {
      expect(getMinCostTierForDifficulty('low')).toBe(0);
    });

    it('returns 0 for medium difficulty', () => {
      expect(getMinCostTierForDifficulty('medium')).toBe(0);
    });

    it('returns 1 for high difficulty (skip free tier)', () => {
      expect(getMinCostTierForDifficulty('high')).toBe(1);
    });
  });
});
