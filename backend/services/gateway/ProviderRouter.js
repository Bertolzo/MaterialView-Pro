import { CreditTracker } from './CreditTracker.js';
import { TaskMetrics } from './TaskMetrics.js';
import { buildProviders } from './providers/index.js';
import { log } from './logger.js';
import { estimateDifficulty, getMinCostTierForDifficulty } from './DifficultyEstimator.js';

export class ProviderRouter {
  constructor(providers = buildProviders(), {
    tracker = new CreditTracker(),
    metrics = new TaskMetrics(),
    timeoutMs = parseInt(process.env.PROVIDER_TIMEOUT_MS || '45000', 10),
    env = process.env,
  } = {}) {
    this.providers = [...providers].sort((a, b) => a.costTier - b.costTier);
    this.tracker = tracker;
    this.metrics = metrics;
    this.timeoutMs = timeoutMs;
    this._env = env;
    const available = this.providers.filter(p => !p.envKey || this._env[p.envKey]).map(p => p.id);
    log('info', 'ProviderRouter', 'initialized', { available, total: this.providers.length });
  }

  async route(imageBase64, material, context) {
    const { difficulty, score: diffScore, reasons } = estimateDifficulty(imageBase64, material, context);
    const minCostTier = getMinCostTierForDifficulty(difficulty);
    log('info', 'ProviderRouter', 'difficulty_estimated', { difficulty, score: diffScore, reasons, minCostTier });
    const eligible = this._selectProviders(difficulty, minCostTier);
    for (const provider of eligible) {
      if (provider.envKey && !this._env[provider.envKey]) {
        log('info', provider.id, 'skipped', { reason: 'no_api_key' });
        continue;
      }
      if (this.tracker.isExhausted(provider)) {
        log('info', provider.id, 'skipped', { reason: 'free_tier_exhausted' });
        continue;
      }
      const startTime = Date.now();
      try {
        const result = await this._callWithTimeout(provider, imageBase64, material, context);
        const latencyMs = Date.now() - startTime;
        if (result.success) {
          this.tracker.increment(provider.id);
          const credits = this.tracker.getState(provider.id, provider.freeCreditLimit);
          this.metrics.record(provider.id, difficulty, { success: true, latencyMs, fidelity: result.fidelity || 0 });
          log('info', provider.id, 'success', { used: credits.used, remaining: credits.remaining, latencyMs, difficulty });
          return { ...result, provider: provider.id, difficulty };
        }
      } catch (err) {
        const latencyMs = Date.now() - startTime;
        this.metrics.record(provider.id, difficulty, { success: false, latencyMs });
        log('warn', provider.id, 'failed', { reason: err.message, difficulty });
      }
    }
    const surfaceLabel = { floor: 'a superficie', wall: 'a parede', ceiling: 'ao teto', 'car-body': 'a carroceria', furniture: 'ao movel' }[context?.surfaceType] || 'a superficie';
    return {
      success: false, fallback: true, editedImageBase64: null, fidelity: 0.0,
      provider: 'local-fallback', difficulty,
      fallbackDescription: 'Simulacao indisponivel. O material ' + material.type + ' ' + material.color + ' ' + material.dimensions + ' seria aplicado ' + surfaceLabel + '.',
    };
  }

  _selectProviders(difficulty, minCostTier) {
    const bestByHistory = this.metrics.getBestForBudget(difficulty, 99, this.providers);
    const ranking = this.metrics.getRanking(difficulty, this.providers);
    const rankMap = new Map(ranking.map((r, i) => [r.id, i]));
    const sorted = [...this.providers]
      .filter(p => p.costTier >= minCostTier)
      .sort((a, b) => {
        if (a.costTier !== b.costTier) return a.costTier - b.costTier;
        const rankA = rankMap.has(a.id) ? rankMap.get(a.id) : 999;
        const rankB = rankMap.has(b.id) ? rankMap.get(b.id) : 999;
        return rankA - rankB;
      });
    if (bestByHistory && rankMap.has(bestByHistory.id)) {
      const bestScore = this.metrics.getScore(bestByHistory.id, difficulty, bestByHistory.costTier);
      if (bestScore !== null && bestScore > 0.7 && bestByHistory.costTier >= minCostTier) {
        const idx = sorted.findIndex(p => p.id === bestByHistory.id);
        if (idx > 0) {
          sorted.splice(idx, 1);
          sorted.unshift(bestByHistory);
          log('info', 'ProviderRouter', 'irt_promotion', { provider: bestByHistory.id, score: bestScore, difficulty });
        }
      }
    }
    return sorted;
  }

  async _callWithTimeout(provider, imageBase64, material, context) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      return await provider.call(imageBase64, material, context, controller.signal);
    } finally {
      clearTimeout(timer);
    }
  }

  resetCredits(providerId) { return this.tracker.reset(providerId); }

  getMetrics() { return this.metrics.getAll(); }
}