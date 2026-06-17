// frontend/src/components/TrialModal.jsx
// Modal de registro de conta trial (50 simulações grátis)

import { useState } from 'react';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

/**
 * @param {{ open: boolean, onClose: () => void, affiliateRef?: string|null, onSuccess?: (apiKey: string) => void }} props
 */
export default function TrialModal({ open, onClose, affiliateRef = null, onSuccess }) {
  const [form, setForm] = useState({ email: '', storeName: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!open) return null;

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload = {
        email: form.email,
        storeName: form.storeName,
        ...(affiliateRef && { ref: affiliateRef }),
      };

      const res = await fetch(`${BASE_URL}/v1/auth/trial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erro ao criar conta. Tente novamente.');
        return;
      }

      onSuccess?.(data.apiKey);
      localStorage.setItem('materialview_api_key', data.apiKey);
      localStorage.removeItem('pisosrealview_api_key');
      window.location.href = '/minha-conta';
    } catch {
      setError('Erro de conexão. Verifique sua internet e tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="trial-modal-title"
      style={styles.overlay}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={styles.modal}>
        <h2 id="trial-modal-title" style={styles.title}>Começar grátis — 50 simulações</h2>

        <form onSubmit={handleSubmit} noValidate>
          <label style={styles.label} htmlFor="trial-email">E-mail *</label>
          <input
            id="trial-email"
            name="email"
            type="email"
            required
            value={form.email}
            onChange={handleChange}
            style={styles.input}
            placeholder="joao@loja.com.br"
          />

          <label style={styles.label} htmlFor="trial-storename">Nome da loja *</label>
          <input
            id="trial-storename"
            name="storeName"
            type="text"
            required
            value={form.storeName}
            onChange={handleChange}
            style={styles.input}
            placeholder="Pisos do João"
          />

          {error && <p style={styles.error} role="alert">{error}</p>}

          <div style={styles.actions}>
            <button type="button" onClick={onClose} style={styles.btnSecondary} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" style={styles.btnPrimary} disabled={loading}>
              {loading ? 'Criando conta...' : 'Começar grátis'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: '#fff',
    borderRadius: '8px',
    padding: '2rem',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
  },
  title: { marginTop: 0, marginBottom: '1.5rem', fontSize: '1.25rem' },
  label: { display: 'block', marginBottom: '0.25rem', fontWeight: 500, fontSize: '0.875rem' },
  input: {
    display: 'block',
    width: '100%',
    padding: '0.5rem 0.75rem',
    marginBottom: '1rem',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontSize: '1rem',
    boxSizing: 'border-box',
  },
  error: { color: '#c0392b', fontSize: '0.875rem', marginBottom: '1rem' },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' },
  btnPrimary: {
    padding: '0.6rem 1.25rem',
    background: '#16a34a',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
  },
  btnSecondary: {
    padding: '0.6rem 1.25rem',
    background: 'transparent',
    color: '#374151',
    border: '1px solid #ccc',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
  },
};
