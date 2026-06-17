// TaskMetrics.js
// Armazena métricas de desempenho por provedor e por nível de dificuldade.
// Inspirado no conceito DAAO de usar histórico para melhorar roteamento futuro.
// Integra com o CreditTracker existente via arquivo JSON separado.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const METRICS_FILE = path.join(__dirname, 'task-metrics.json');

/**
 * Estrutura de métricas por provedor:
 * {
 *   "wavespeed-ai": {
 *     "low":    { calls: 10, successes: 9, totalLatencyMs: 15000, avgFidelity: 0.85 },
 *     "medium": { calls: 5,  successes: 4, totalLatencyMs: 12000, avgFidelity: 0.82 },
 *     "high":   { calls: 2,  successes: 2, totalLatencyMs: 8000,  avgFidelity: 0.88 }
 *   }
 * }
 */

export class TaskMetrics {
  constructor({ fsModule = fs } = {}) {
    this._fs = fsModule;
    this.metrics = this._load();
  }

  /**
   * Registra o resultado de uma chamada a um provedor.
   */
  record(providerId, difficulty, { success, latencyMs, fidelity = 0 }) {
    if (!this.metrics[providerId]) {
      this.metrics[providerId] = {};
    }
    if (!this.metrics[providerId][difficulty]) {
      this.metrics[providerId][difficulty] = {
        calls: 0, successes: 0, totalLatencyMs: 0, totalFidelity: 0,
      };
    }

    const m = this.metrics[providerId][difficulty];
    m.calls++;
    if (success) {
      m.successes++;
      m.totalLatencyMs += latencyMs;
      m.totalFidelity += fidelity;
    }

    this._save();
  }

  /**
   * Score composto inspirado em BEST-Route (ICML 2025):
   * Otimização de múltiplos objetivos — qualidade × fidelidade × eficiência de custo.
   * 
   * score = successRate × (α × avgFidelity + β × latencyScore + γ × costEfficiency)
   * onde α=0.5, β=0.3, γ=0.2
   * 
   * costEfficiency: provedores com costTier menor recebem bônus (tier 0 = 1.0, tier 1 = 0.8, tier 2 = 0.6)
   */
  getScore(providerId, difficulty, costTier = 1) {
    const m = this.metrics[providerId]?.[difficulty];
    if (!m || m.calls === 0) return null;

    const successRate = m.successes / m.calls;
    const avgFidelity = m.successes > 0 ? m.totalFidelity / m.successes : 0;
    const avgLatencyMs = m.successes > 0 ? m.totalLatencyMs / m.successes : 45000;

    // Normaliza latência: 0ms = 1.0, 45000ms ≈ 0.5
    const latencyScore = 1 / (1 + avgLatencyMs / 45000);

    // Eficiência de custo: tier 0 = 1.0, tier 1 = 0.8, tier 2 = 0.6, tier 3+ = 0.4
    const costEfficiency = Math.max(0.4, 1.0 - costTier * 0.2);

    return successRate * (0.5 * avgFidelity + 0.3 * latencyScore + 0.2 * costEfficiency);
  }

  /**
   * Retorna o melhor provedor para uma dificuldade dado um orçamento máximo (costTier).
   * Inspirado em BEST-Route: encontrar o ótimo dentro de uma restrição de custo.
   */
  getBestForBudget(difficulty, maxCostTier, providers) {
    const eligible = providers.filter(p => p.costTier <= maxCostTier);
    if (eligible.length === 0) return null;

    let best = null;
    let bestScore = -1;

    for (const provider of eligible) {
      const score = this.getScore(provider.id, difficulty, provider.costTier);
      if (score !== null && score > bestScore) {
        bestScore = score;
        best = provider;
      }
    }

    return best; // null se nenhum tem dados históricos
  }

  /**
   * Retorna todos os scores para uma dificuldade, ordenados do melhor para o pior.
   */
  getRanking(difficulty, providers = []) {
    const providerMap = new Map(providers.map(p => [p.id, p.costTier]));
    return Object.keys(this.metrics)
      .map(id => ({
        id,
        score: this.getScore(id, difficulty, providerMap.get(id) ?? 1),
      }))
      .filter(e => e.score !== null)
      .sort((a, b) => b.score - a.score);
  }

  getAll() {
    return { ...this.metrics };
  }

  _load() {
    try {
      const raw = this._fs.readFileSync(METRICS_FILE, 'utf8');
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }

  _save() {
    try {
      this._fs.writeFileSync(METRICS_FILE, JSON.stringify(this.metrics, null, 2));
    } catch (err) {
      console.error('[TaskMetrics] Failed to persist metrics:', err.message);
    }
  }
}
