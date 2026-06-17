// backend/middleware/__tests__/safeCompare.test.js
import { describe, it, expect } from 'vitest';
import { safeCompare } from '../safeCompare.js';

describe('safeCompare', () => {
  // 5.2 — strings idênticas retornam true
  it('retorna true para strings idênticas', () => {
    expect(safeCompare('abc123', 'abc123')).toBe(true);
    expect(safeCompare('sk_live_abc', 'sk_live_abc')).toBe(true);
  });

  // 5.3 — strings diferentes retornam false
  it('retorna false para strings diferentes', () => {
    expect(safeCompare('abc', 'xyz')).toBe(false);
    expect(safeCompare('sk_live_abc', 'sk_live_xyz')).toBe(false);
  });

  // 5.4 — valores falsy retornam false sem exceção
  it('retorna false para null sem lançar exceção', () => {
    expect(() => safeCompare(null, 'abc')).not.toThrow();
    expect(safeCompare(null, 'abc')).toBe(false);
  });

  it('retorna false para undefined sem lançar exceção', () => {
    expect(() => safeCompare(undefined, 'abc')).not.toThrow();
    expect(safeCompare(undefined, 'abc')).toBe(false);
  });

  it('retorna false para string vazia sem lançar exceção', () => {
    expect(() => safeCompare('', 'abc')).not.toThrow();
    expect(safeCompare('', 'abc')).toBe(false);
  });

  it('retorna false quando ambos são null', () => {
    expect(safeCompare(null, null)).toBe(false);
  });

  // 5.5 — strings de comprimentos diferentes retornam false sem exceção
  it('retorna false para strings de comprimentos diferentes sem lançar exceção', () => {
    expect(() => safeCompare('abc', 'abcd')).not.toThrow();
    expect(safeCompare('abc', 'abcd')).toBe(false);
    expect(safeCompare('abcde', 'ab')).toBe(false);
  });

  // 5.6 — equivalência funcional com === (property test manual)
  it('é funcionalmente equivalente a === para strings arbitrárias', () => {
    const pairs = [
      ['hello', 'hello'],
      ['hello', 'world'],
      ['sk_live_abc123', 'sk_live_abc123'],
      ['sk_live_abc123', 'sk_live_abc124'],
      ['', ''],
      ['a', 'a'],
      ['a', 'b'],
    ];
    for (const [a, b] of pairs) {
      // safeCompare deve concordar com === para strings não-falsy
      if (a && b) {
        expect(safeCompare(a, b)).toBe(a === b);
      }
    }
  });

  // 5.7 — performance: lookup com 200 chaves deve ser < 50ms
  it('lookup com 200 chaves executa em menos de 50ms', () => {
    // Simula o cenário de usage.js: Object.entries(keys).find(([k]) => safeCompare(k, apiKey))
    const keys = {};
    for (let i = 0; i < 199; i++) {
      keys[`sk_live_${'x'.repeat(32)}${i.toString().padStart(3, '0')}`] = { active: true };
    }
    const targetKey = 'sk_live_' + 'a'.repeat(32) + '199';
    keys[targetKey] = { active: true };

    const start = Date.now();
    const entry = Object.entries(keys).find(([k]) => safeCompare(k, targetKey));
    const elapsed = Date.now() - start;

    expect(entry).toBeDefined();
    expect(entry[0]).toBe(targetKey);
    expect(elapsed).toBeLessThan(50);
  });
});
