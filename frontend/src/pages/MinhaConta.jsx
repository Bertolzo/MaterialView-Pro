// frontend/src/pages/MinhaConta.jsx
// Área do cliente: exibe consumo do mês e API key

import { useState, useEffect } from 'react';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export default function MinhaConta() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('pisosrealview_api_key') || '');
  const [usage, setUsage] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (apiKey) fetchUsage(apiKey);
  }, []);

  async function fetchUsage(key) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE_URL}/v1/usage`, {
        headers: { 'x-api-key': key },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao carregar dados.');
        return;
      }
      setUsage(data);
    } catch {
      setError('Erro de conexão. Verifique sua internet.');
    } finally {
      setLoading(false);
    }
  }

  function handleKeySubmit(e) {
    e.preventDefault();
    const key = e.target.elements.apiKey.value.trim();
    if (!key) return;
    localStorage.setItem('pisosrealview_api_key', key);
    setApiKey(key);
    fetchUsage(key);
  }

  function copyKey() {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const pct = usage ? Math.min(100, Math.round((usage.used / usage.limit) * 100)) : 0;

  return (
    <main style={s.container}>
      <header style={s.header}>
        <h1 style={s.title}>Minha Conta</h1>
        <a href="/" style={s.link}>← Voltar para simulação</a>
      </header>

      {!apiKey && (
        <section style={s.card}>
          <p style={s.label}>Insira sua API key para ver seu consumo:</p>
          <form onSubmit={handleKeySubmit} style={s.row}>
            <input
              name="apiKey"
              type="text"
              placeholder="sk_live_..."
              style={s.input}
              autoComplete="off"
            />
            <button type="submit" style={s.btnPrimary}>Entrar</button>
          </form>
        </section>
      )}

      {apiKey && (
        <section style={s.card}>
          <p style={s.label}>Sua API key</p>
          <div style={s.row}>
            <code style={s.code}>{apiKey.slice(0, 12)}{'•'.repeat(20)}</code>
            <button onClick={copyKey} style={s.btnSecondary}>
              {copied ? '✓ Copiado' : 'Copiar'}
            </button>
          </div>
        </section>
      )}

      {loading && <p style={s.muted}>Carregando...</p>}
      {error && <p style={s.error} role="alert">{error}</p>}

      {usage && (
        <>
          <section style={s.card}>
            <p style={s.label}>Plano atual</p>
            <p style={s.planBadge}>{usage.plan.toUpperCase()}</p>
            {usage.storeName && <p style={s.muted}>{usage.storeName}</p>}
          </section>

          <section style={s.card}>
            <p style={s.label}>Simulações este mês</p>
            <p style={s.bigNumber}>
              {usage.used} <span style={s.muted}>/ {usage.limit === Infinity ? '∞' : usage.limit}</span>
            </p>
            <div style={s.barBg}>
              <div style={{ ...s.barFill, width: `${pct}%`, background: pct > 80 ? '#dc2626' : '#16a34a' }} />
            </div>
            <p style={s.muted}>{usage.remaining === Infinity ? '∞' : usage.remaining} simulações restantes</p>
          </section>

          {usage.plan === 'trial' && (
            <section style={{ ...s.card, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              <p style={{ fontWeight: 600, color: '#15803d', marginBottom: '0.5rem' }}>
                Gostou? Assine para continuar
              </p>
              <p style={s.muted}>Plano Básico: 200 simulações/mês por R$ 197</p>
              <a href="/?assinar=1" style={s.btnCta}>Ver planos</a>
            </section>
          )}
        </>
      )}
    </main>
  );
}

const s = {
  container: { maxWidth: '560px', margin: '0 auto', padding: '2rem 1rem', fontFamily: 'sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' },
  title: { margin: 0, fontSize: '1.5rem' },
  link: { color: '#6b7280', fontSize: '0.875rem', textDecoration: 'none' },
  card: { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1.25rem', marginBottom: '1rem' },
  label: { margin: '0 0 0.5rem', fontSize: '0.8rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' },
  row: { display: 'flex', gap: '0.5rem', alignItems: 'center' },
  input: { flex: 1, padding: '0.5rem 0.75rem', border: '1px solid #ccc', borderRadius: '4px', fontSize: '0.9rem' },
  code: { flex: 1, background: '#e5e7eb', padding: '0.4rem 0.75rem', borderRadius: '4px', fontSize: '0.85rem', fontFamily: 'monospace' },
  planBadge: { display: 'inline-block', background: '#dbeafe', color: '#1d4ed8', padding: '0.25rem 0.75rem', borderRadius: '999px', fontWeight: 700, fontSize: '0.85rem', margin: '0.25rem 0' },
  bigNumber: { fontSize: '2rem', fontWeight: 700, margin: '0.25rem 0' },
  muted: { color: '#6b7280', fontSize: '0.875rem', margin: '0.25rem 0' },
  barBg: { background: '#e5e7eb', borderRadius: '999px', height: '8px', margin: '0.5rem 0' },
  barFill: { height: '8px', borderRadius: '999px', transition: 'width 0.3s' },
  error: { color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '0.75rem', marginBottom: '1rem' },
  btnPrimary: { padding: '0.5rem 1rem', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem' },
  btnSecondary: { padding: '0.4rem 0.75rem', background: 'transparent', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem', whiteSpace: 'nowrap' },
  btnCta: { display: 'inline-block', marginTop: '0.75rem', padding: '0.6rem 1.25rem', background: '#15803d', color: '#fff', borderRadius: '4px', textDecoration: 'none', fontSize: '0.9rem' },
};
