import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CREDITS_FILE = path.join(__dirname, 'credits.json');

export class CreditTracker {
  /**
   * @param {{ clock?: () => Date, fs?: typeof import('fs') }} options
   */
  constructor({ clock = () => new Date(), fsModule = fs } = {}) {
    this._clock = clock;
    this._fs = fsModule;
    this.state = this._load();
  }

  isExhausted(provider) {
    this._ensureMonth();
    if (!provider.freeCreditLimit) return false;
    const used = this.state.counters[provider.id] || 0;
    return used >= provider.freeCreditLimit;
  }

  increment(providerId) {
    this._ensureMonth();
    this.state.counters[providerId] = (this.state.counters[providerId] || 0) + 1;
    this._save();
  }

  getState(providerId, freeCreditLimit) {
    this._ensureMonth();
    const used = this.state.counters[providerId] || 0;
    const remaining = freeCreditLimit ? Math.max(0, freeCreditLimit - used) : null;
    return { used, remaining };
  }

  reset(providerId) {
    this._ensureMonth();
    if (providerId) {
      this.state.counters[providerId] = 0;
    } else {
      Object.keys(this.state.counters).forEach(k => { this.state.counters[k] = 0; });
    }
    this._save();
    return this.state.counters;
  }

  _ensureMonth() {
    const currentMonth = this._clock().toISOString().slice(0, 7);
    if (this.state.month !== currentMonth) {
      this.state = { month: currentMonth, counters: {} };
      this._save();
    }
  }

  _load() {
    try {
      const raw = this._fs.readFileSync(CREDITS_FILE, 'utf8');
      const data = JSON.parse(raw);
      const currentMonth = this._clock().toISOString().slice(0, 7);
      if (data.month !== currentMonth) return { month: currentMonth, counters: {} };
      return data;
    } catch {
      return { month: this._clock().toISOString().slice(0, 7), counters: {} };
    }
  }

  _save() {
    try {
      this._fs.writeFileSync(CREDITS_FILE, JSON.stringify(this.state, null, 2));
    } catch (err) {
      console.error('[CreditTracker] Failed to persist state:', err.message);
    }
  }
}
