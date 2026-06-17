import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock fs to avoid real file I/O from CreditTracker
vi.mock('fs', () => ({
  default: {
    readFileSync: vi.fn(() => { throw new Error('ENOENT'); }),
    writeFileSync: vi.fn(),
  },
  readFileSync: vi.fn(() => { throw new Error('ENOENT'); }),
  writeFileSync: vi.fn(),
}));

// Mock logger to suppress output during tests
vi.mock('../logger.js', () => ({
  log: vi.fn(),
}));

const material = { type: 'porcelain', color: 'white', dimensions: '60x60cm' };
const context = {};

function makeProvider(id, costTier, freeCreditLimit = 0, envKey = null, callFn = null) {
  return {
    id,
    costTier,
    freeCreditLimit,
    envKey,
    call: callFn || vi.fn().mockResolvedValue({ success: true, editedImageBase64: 'data:image/jpeg;base64,abc', fidelity: 0.8 }),
  };
}

async function getRouter(providers) {
  vi.resetModules();
  const { ProviderRouter } = await import('../ProviderRouter.js');
  return new ProviderRouter(providers);
}

describe('ProviderRouter', () => {
  describe('ordering (P1)', () => {
    it('sorts providers by costTier ascending on construction', async () => {
      const p1 = makeProvider('expensive', 2);
      const p2 = makeProvider('cheap', 0);
      const p3 = makeProvider('mid', 1);
      const router = await getRouter([p1, p2, p3]);
      const ids = router.providers.map(p => p.id);
      expect(ids).toEqual(['cheap', 'mid', 'expensive']);
    });

    it('tries lower costTier provider first', async () => {
      const callOrder = [];
      const p1 = makeProvider('tier2', 2, 0, null, vi.fn().mockImplementation(async () => {
        callOrder.push('tier2');
        return { success: true, editedImageBase64: 'data:image/jpeg;base64,x', fidelity: 0.8 };
      }));
      const p2 = makeProvider('tier0', 0, 0, null, vi.fn().mockImplementation(async () => {
        callOrder.push('tier0');
        return { success: true, editedImageBase64: 'data:image/jpeg;base64,x', fidelity: 0.8 };
      }));
      const router = await getRouter([p1, p2]);
      await router.route('data:image/jpeg;base64,img', material, context);
      expect(callOrder[0]).toBe('tier0');
    });
  });

  describe('API key check', () => {
    it('skips provider when envKey is set but env var is missing', async () => {
      const skipped = makeProvider('no-key-provider', 0, 0, 'MISSING_KEY_XYZ');
      const fallback = makeProvider('fallback-provider', 1, 0, null);
      // Ensure env var is not set
      delete process.env.MISSING_KEY_XYZ;
      const router = await getRouter([skipped, fallback]);
      const result = await router.route('data:image/jpeg;base64,img', material, context);
      expect(skipped.call).not.toHaveBeenCalled();
      expect(result.provider).toBe('fallback-provider');
    });

    it('uses provider when envKey is null (no key required)', async () => {
      const p = makeProvider('no-key-needed', 0, 0, null);
      const router = await getRouter([p]);
      const result = await router.route('data:image/jpeg;base64,img', material, context);
      expect(p.call).toHaveBeenCalled();
      expect(result.provider).toBe('no-key-needed');
    });
  });

  describe('free tier exhaustion', () => {
    it('skips provider when free tier is exhausted', async () => {
      const exhausted = makeProvider('pika', 0, 1, null); // limit=1
      const next = makeProvider('wave', 1, 0, null);
      const router = await getRouter([exhausted, next]);
      // Exhaust the free tier
      router.tracker.state.counters['pika'] = 1;
      const result = await router.route('data:image/jpeg;base64,img', material, context);
      expect(exhausted.call).not.toHaveBeenCalled();
      expect(result.provider).toBe('wave');
    });
  });

  describe('fallback (P4)', () => {
    it('returns local-fallback when all providers fail', async () => {
      const p1 = makeProvider('p1', 0, 0, null, vi.fn().mockRejectedValue(new Error('fail')));
      const p2 = makeProvider('p2', 1, 0, null, vi.fn().mockRejectedValue(new Error('fail')));
      const router = await getRouter([p1, p2]);
      const result = await router.route('data:image/jpeg;base64,img', material, context);
      expect(result.provider).toBe('local-fallback');
      expect(result.fallback).toBe(true);
      expect(result.success).toBe(false);
    });

    it('returns local-fallback when no providers are configured', async () => {
      const router = await getRouter([]);
      const result = await router.route('data:image/jpeg;base64,img', material, context);
      expect(result.provider).toBe('local-fallback');
      expect(result.fallback).toBe(true);
    });

    it('fallback includes fallbackDescription with material info', async () => {
      const router = await getRouter([]);
      const result = await router.route('data:image/jpeg;base64,img', material, context);
      expect(result.fallbackDescription).toContain(material.type);
      expect(result.fallbackDescription).toContain(material.color);
    });
  });

  describe('provider field in response', () => {
    it('includes the correct provider id in the response', async () => {
      const p = makeProvider('my-provider', 0, 0, null);
      const router = await getRouter([p]);
      const result = await router.route('data:image/jpeg;base64,img', material, context);
      expect(result.provider).toBe('my-provider');
    });

    it('tries next provider when first returns success: false', async () => {
      const p1 = makeProvider('p1', 0, 0, null, vi.fn().mockResolvedValue({ success: false }));
      const p2 = makeProvider('p2', 1, 0, null);
      const router = await getRouter([p1, p2]);
      const result = await router.route('data:image/jpeg;base64,img', material, context);
      expect(result.provider).toBe('p2');
    });
  });

  describe('resetCredits', () => {
    it('delegates to CreditTracker.reset', async () => {
      const router = await getRouter([]);
      router.tracker.state.counters['pika-labs'] = 50;
      router.resetCredits('pika-labs');
      expect(router.tracker.state.counters['pika-labs']).toBe(0);
    });

    it('resets all counters when no providerId given', async () => {
      const router = await getRouter([]);
      router.tracker.state.counters['pika-labs'] = 50;
      router.tracker.state.counters['wavespeed-ai'] = 10;
      router.resetCredits();
      expect(router.tracker.state.counters['pika-labs']).toBe(0);
      expect(router.tracker.state.counters['wavespeed-ai']).toBe(0);
    });
  });

  describe('timeout', () => {
    it('aborta provider lento e cai no fallback', async () => {
      vi.resetModules();
      const { ProviderRouter } = await import('../ProviderRouter.js');

      const slowProvider = makeProvider('slow', 0, 0, null, vi.fn().mockImplementation(
        (_img, _mat, _ctx, signal) =>
          new Promise((resolve, reject) => {
            const timer = setTimeout(() => resolve({ success: true, editedImageBase64: 'x', fidelity: 0.9 }), 60000);
            signal.addEventListener('abort', () => {
              clearTimeout(timer);
              reject(new Error('The operation was aborted'));
            });
          })
      ));

      const router = new ProviderRouter([slowProvider], { timeoutMs: 50 });
      const result = await router.route('data:image/jpeg;base64,img', material, context);

      // Provider lento foi abortado, sistema caiu no fallback
      expect(result.provider).toBe('local-fallback');
      expect(result.fallback).toBe(true);
    }, 5000); // timeout do teste: 5s (bem acima dos 50ms do router)

    it('provider rápido não é abortado', async () => {
      vi.resetModules();
      const { ProviderRouter } = await import('../ProviderRouter.js');

      const fastProvider = makeProvider('fast', 0, 0, null, vi.fn().mockImplementation(
        async () => ({ success: true, editedImageBase64: 'data:image/jpeg;base64,ok', fidelity: 0.9 })
      ));

      const router = new ProviderRouter([fastProvider], { timeoutMs: 5000 });
      const result = await router.route('data:image/jpeg;base64,img', material, context);

      expect(result.provider).toBe('fast');
      expect(result.success).toBe(true);
    });
  });
});
