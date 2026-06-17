import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('fs', () => ({
  default: { readFileSync: vi.fn(() => { throw new Error('ENOENT'); }), writeFileSync: vi.fn() },
  readFileSync: vi.fn(() => { throw new Error('ENOENT'); }),
  writeFileSync: vi.fn(),
}));

async function freshMetrics() {
  vi.resetModules();
  const { TaskMetrics } = await import('../TaskMetrics.js');
  return new TaskMetrics();
}

describe('TaskMetrics', () => {
  it('returns null score for provider with no data', async () => {
    const m = await freshMetrics();
    expect(m.getScore('wavespeed-ai', 'low')).toBeNull();
  });

  it('records success and computes positive score', async () => {
    const m = await freshMetrics();
    m.record('wavespeed-ai', 'low', { success: true, latencyMs: 2000, fidelity: 0.85 });
    const score = m.getScore('wavespeed-ai', 'low');
    expect(score).toBeGreaterThan(0);
  });

  it('records failure and computes zero score (0 successes)', async () => {
    const m = await freshMetrics();
    m.record('wavespeed-ai', 'low', { success: false, latencyMs: 1000 });
    const score = m.getScore('wavespeed-ai', 'low');
    expect(score).toBe(0);
  });

  it('getRanking returns providers sorted by score descending', async () => {
    const m = await freshMetrics();
    m.record('provider-a', 'medium', { success: true, latencyMs: 1000, fidelity: 0.9 });
    m.record('provider-b', 'medium', { success: true, latencyMs: 5000, fidelity: 0.6 });
    const ranking = m.getRanking('medium');
    expect(ranking[0].id).toBe('provider-a');
    expect(ranking[1].id).toBe('provider-b');
  });

  it('getRanking excludes providers with no data for that difficulty', async () => {
    const m = await freshMetrics();
    m.record('provider-a', 'low', { success: true, latencyMs: 1000, fidelity: 0.9 });
    const ranking = m.getRanking('high'); // provider-a só tem dados para 'low'
    expect(ranking).toHaveLength(0);
  });
});
