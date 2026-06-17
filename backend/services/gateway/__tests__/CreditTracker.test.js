import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// We need to test CreditTracker in isolation — mock fs to avoid real file I/O
vi.mock('fs');

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Helper to import a fresh CreditTracker each test (reset module state)
async function freshTracker(fileContent = null) {
  vi.resetModules();
  const { readFileSync, writeFileSync } = await import('fs');
  if (fileContent) {
    readFileSync.mockReturnValue(JSON.stringify(fileContent));
  } else {
    readFileSync.mockImplementation(() => { throw new Error('ENOENT'); });
  }
  writeFileSync.mockImplementation(() => {});

  const { CreditTracker } = await import('../CreditTracker.js');
  return { CreditTracker, writeFileSync };
}

describe('CreditTracker', () => {
  const currentMonth = new Date().toISOString().slice(0, 7);

  describe('isExhausted', () => {
    it('returns false when freeCreditLimit is 0 (unlimited)', async () => {
      const { CreditTracker } = await freshTracker();
      const tracker = new CreditTracker();
      const provider = { id: 'zhipu-cogview', freeCreditLimit: 0 };
      expect(tracker.isExhausted(provider)).toBe(false);
    });

    it('returns false when usage is below limit', async () => {
      const { CreditTracker } = await freshTracker({
        month: currentMonth,
        counters: { 'pika-labs': 10 },
      });
      const tracker = new CreditTracker();
      const provider = { id: 'pika-labs', freeCreditLimit: 80 };
      expect(tracker.isExhausted(provider)).toBe(false);
    });

    it('returns true when usage equals limit', async () => {
      const { CreditTracker } = await freshTracker({
        month: currentMonth,
        counters: { 'pika-labs': 80 },
      });
      const tracker = new CreditTracker();
      const provider = { id: 'pika-labs', freeCreditLimit: 80 };
      expect(tracker.isExhausted(provider)).toBe(true);
    });

    it('returns true when usage exceeds limit', async () => {
      const { CreditTracker } = await freshTracker({
        month: currentMonth,
        counters: { 'pika-labs': 85 },
      });
      const tracker = new CreditTracker();
      const provider = { id: 'pika-labs', freeCreditLimit: 80 };
      expect(tracker.isExhausted(provider)).toBe(true);
    });
  });

  describe('increment', () => {
    it('increments counter from 0', async () => {
      const { CreditTracker } = await freshTracker({ month: currentMonth, counters: {} });
      const tracker = new CreditTracker();
      tracker.increment('pika-labs');
      expect(tracker.state.counters['pika-labs']).toBe(1);
    });

    it('increments counter from existing value', async () => {
      const { CreditTracker } = await freshTracker({
        month: currentMonth,
        counters: { 'pika-labs': 5 },
      });
      const tracker = new CreditTracker();
      tracker.increment('pika-labs');
      expect(tracker.state.counters['pika-labs']).toBe(6);
    });
  });

  describe('getState', () => {
    it('returns used and remaining when freeCreditLimit is set', async () => {
      const { CreditTracker } = await freshTracker({
        month: currentMonth,
        counters: { 'pika-labs': 20 },
      });
      const tracker = new CreditTracker();
      const state = tracker.getState('pika-labs', 80);
      expect(state).toEqual({ used: 20, remaining: 60 });
    });

    it('returns remaining: null when freeCreditLimit is 0', async () => {
      const { CreditTracker } = await freshTracker({ month: currentMonth, counters: {} });
      const tracker = new CreditTracker();
      const state = tracker.getState('zhipu-cogview', 0);
      expect(state).toEqual({ used: 0, remaining: null });
    });

    it('remaining never goes below 0', async () => {
      const { CreditTracker } = await freshTracker({
        month: currentMonth,
        counters: { 'pika-labs': 100 },
      });
      const tracker = new CreditTracker();
      const state = tracker.getState('pika-labs', 80);
      expect(state.remaining).toBe(0);
    });
  });

  describe('reset', () => {
    it('resets a specific provider counter to 0', async () => {
      const { CreditTracker } = await freshTracker({
        month: currentMonth,
        counters: { 'pika-labs': 50, 'wavespeed-ai': 10 },
      });
      const tracker = new CreditTracker();
      tracker.reset('pika-labs');
      expect(tracker.state.counters['pika-labs']).toBe(0);
      expect(tracker.state.counters['wavespeed-ai']).toBe(10);
    });

    it('resets all counters when no providerId given', async () => {
      const { CreditTracker } = await freshTracker({
        month: currentMonth,
        counters: { 'pika-labs': 50, 'wavespeed-ai': 10 },
      });
      const tracker = new CreditTracker();
      tracker.reset();
      expect(tracker.state.counters['pika-labs']).toBe(0);
      expect(tracker.state.counters['wavespeed-ai']).toBe(0);
    });

    it('is idempotent — calling reset twice produces same result (P2)', async () => {
      const { CreditTracker } = await freshTracker({
        month: currentMonth,
        counters: { 'pika-labs': 50 },
      });
      const tracker = new CreditTracker();
      const first = tracker.reset('pika-labs');
      const second = tracker.reset('pika-labs');
      expect(first).toEqual(second);
      expect(second['pika-labs']).toBe(0);
    });
  });

  describe('monthly rollover (P3)', () => {
    it('discards state from a previous month and resets counters', async () => {
      const { CreditTracker } = await freshTracker({
        month: '2020-01',
        counters: { 'pika-labs': 75 },
      });
      const tracker = new CreditTracker();
      expect(tracker.state.month).toBe(currentMonth);
      expect(tracker.state.counters).toEqual({});
    });

    it('_ensureMonth resets state when month changes mid-session', async () => {
      const { CreditTracker } = await freshTracker({
        month: currentMonth,
        counters: { 'pika-labs': 30 },
      });
      const tracker = new CreditTracker();
      tracker.state.month = '2020-01';
      tracker._ensureMonth();
      expect(tracker.state.month).toBe(currentMonth);
      expect(tracker.state.counters).toEqual({});
    });
  });

  describe('concorrência (P4)', () => {
    it('incrementos concorrentes são consistentes — sem race condition', async () => {
      const { CreditTracker } = await freshTracker({ month: currentMonth, counters: {} });
      const tracker = new CreditTracker();

      const TOTAL = 100;
      const THREADS = 10;
      const PER_THREAD = TOTAL / THREADS;

      await Promise.all(
        Array.from({ length: THREADS }, () =>
          Promise.all(
            Array.from({ length: PER_THREAD }, () =>
              Promise.resolve(tracker.increment('pika-labs'))
            )
          )
        )
      );

      // JavaScript é single-threaded: Promise.all não cria race condition real.
      // Este teste documenta o comportamento esperado e serve como baseline
      // antes de migrar para Redis (que resolve race conditions em multi-processo).
      expect(tracker.state.counters['pika-labs']).toBe(TOTAL);
    });

    it('múltiplos provedores incrementados concorrentemente mantêm contadores independentes', async () => {
      const { CreditTracker } = await freshTracker({ month: currentMonth, counters: {} });
      const tracker = new CreditTracker();

      await Promise.all([
        ...Array.from({ length: 30 }, () => Promise.resolve(tracker.increment('pika-labs'))),
        ...Array.from({ length: 20 }, () => Promise.resolve(tracker.increment('wavespeed-ai'))),
        ...Array.from({ length: 10 }, () => Promise.resolve(tracker.increment('zhipu-cogview'))),
      ]);

      expect(tracker.state.counters['pika-labs']).toBe(30);
      expect(tracker.state.counters['wavespeed-ai']).toBe(20);
      expect(tracker.state.counters['zhipu-cogview']).toBe(10);
    });
  });
});
