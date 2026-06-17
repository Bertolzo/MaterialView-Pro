// frontend/src/components/CheckoutModal.jsx
// Modal de checkout para assinar um plano via Asaas (checkout hospedado)
// NÃO lida com dados de cartão diretamente.

import { useState } from 'react';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const PLANS = [
  { id: 'trial', label: 'Trial — R$ 0 (50 simulações)', value: 0 },
  { id: 'basic', label: 'Básico — R$ 197/mês (200 simulações)', value: 197 },
  { id: 'popular', label: 'Popular — R$ 347/mês (500 simulações)', value: 347 },
  { id: 'pro', label: 'Pro — R$ 597/mês (1.000 simulações)', value: 597 },
  { id: 'enterprise', label: 'Enterprise — R$ 1.497/mês (3.000 simulações)', value: 1497 },
];

/**
 * @param {{ open: boolean, onClose: () => void, affiliateRef?: string|null }} props
 */
export default function CheckoutModal({ open, onClose, affiliateRef = null }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    cpfCnpj: '',
    phone: '',
    plan: 'basic',
  });
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
      const res = await fetch(`${BASE_URL}/v1/billing/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, ...(affiliateRef && { ref: affiliateRef }) }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Erro ao processar assinatura. Tente novamente.');
        return;
      }

      if (data.paymentLink) {
        // Redirecionar para o checkout hospedado do Asaas
        window.location.href = data.paymentLink;
      } else {
        setError('Link de pagamento não disponível. Tente novamente.');
      }
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
      aria-labelledby="checkout-modal-title"
      style={styles.overlay}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={styles.modal}>
        <h2 id="checkout-modal-title" style={styles.title}>Assinar MaterialView Pro</h2>

        <form onSubmit={handleSubmit} noValidate>
          <label style={styles.label} htmlFor="checkout-name">Nome completo *</label>
          <input
            id="checkout-name"
            name="name"
            type="text"
            required
            value={form.name}
            onChange={handleChange}
            style={styles.input}
            placeholder="João da Silva"
          />

          <label style={styles.label} htmlFor="checkout-email">E-mail *</label>
          <input
            id="checkout-email"
            name="email"
            type="email"
            required
            value={form.email}
            onChange={handleChange}
            style={styles.input}
            placeholder="joao@loja.com.br"
          />

          <label style={styles.label} htmlFor="checkout-cpfcnpj">CPF / CNPJ *</label>
          <input
            id="checkout-cpfcnpj"
            name="cpfCnpj"
            type="text"
            required
            value={form.cpfCnpj}
            onChange={handleChange}
            style={styles.input}
            placeholder="00.000.000/0001-00"
          />

          <label style={styles.label} htmlFor="checkout-phone">Telefone</label>
          <input
            id="checkout-phone"
            name="phone"
            type="tel"
            value={form.phone}
            onChange={handleChange}
            style={styles.input}
            placeholder="(11) 99999-9999"
          />

          <label style={styles.label} htmlFor="checkout-plan">Plano *</label>
          <select
            id="checkout-plan"
            name="plan"
            required
            value={form.plan}
            onChange={handleChange}
            style={styles.input}
          >
            {PLANS.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>

          {error && <p style={styles.error} role="alert">{error}</p>}

          <div style={styles.actions}>
            <button
              type="button"
              onClick={onClose}
              style={styles.btnSecondary}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              style={styles.btnPrimary}
              disabled={loading}
            >
              {loading ? 'Processando...' : 'Ir para pagamento'}
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
    maxWidth: '480px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
  },
  title: {
    marginTop: 0,
    marginBottom: '1.5rem',
    fontSize: '1.25rem',
  },
  label: {
    display: 'block',
    marginBottom: '0.25rem',
    fontWeight: 500,
    fontSize: '0.875rem',
  },
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
  error: {
    color: '#c0392b',
    fontSize: '0.875rem',
    marginBottom: '1rem',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.75rem',
    marginTop: '0.5rem',
  },
  btnPrimary: {
    padding: '0.6rem 1.25rem',
    background: '#2563eb',
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
