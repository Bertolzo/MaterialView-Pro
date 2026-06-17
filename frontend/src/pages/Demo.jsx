// frontend/src/pages/Demo.jsx
// Página de demonstração pública — sem necessidade de login ou API key.
// Usa header x-demo-mode: true para autenticação automática via clientId demo-public.

import { useState } from 'react';
import ImageUploader from '../components/ImageUploader.jsx';
import MaterialSelector from '../components/MaterialSelector.jsx';
import TrialModal from '../components/TrialModal.jsx';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const MATERIALS = [
  { type: 'porcelanato', color: 'cinza-claro', dimensions: '60x60cm' },
  { type: 'vinílico', color: 'carvalho', dimensions: '120x20cm' },
  { type: 'madeira', color: 'bege', dimensions: '90x15cm' },
];

const PROGRESS_STEPS = [
  'Analisando imagem...',
  'Aplicando material...',
  'Finalizando...',
];

export default function Demo() {
  const [imageBase64, setImageBase64] = useState(null);
  const [material, setMaterial] = useState(MATERIALS[0]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [trialOpen, setTrialOpen] = useState(false);

  async function handleSimulate() {
    if (!imageBase64) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setProgressStep(0);

    // Avança os textos de progresso a cada ~2s
    const stepInterval = setInterval(() => {
      setProgressStep((prev) => Math.min(prev + 1, PROGRESS_STEPS.length - 1));
    }, 2000);

    try {
      const response = await fetch(`${BASE_URL}/v1/simulate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-mode': 'true',
        },
        body: JSON.stringify({ imageBase64, material }),
      });

      if (response.status === 429) {
        const data = await response.json();
        setError(data.error || 'Limite diário da demo atingido. Volte amanhã.');
        return;
      }

      if (response.status === 200) {
        const data = await response.json();
        if (data.editedImageBase64) {
          setResult(data);
        } else if (data.fallbackDescription) {
          setError(`Fallback: ${data.fallbackDescription}`);
        } else {
          setError('Resposta inesperada do servidor.');
        }
      } else if (response.status === 409) {
        setError('Este material não é compatível com a imagem. Tente outro material ou outra foto.');
      } else {
        setError('Ocorreu um erro ao processar sua solicitação. Tente novamente.');
      }
    } catch {
      setError('Ocorreu um erro de conexão. Verifique sua internet e tente novamente.');
    } finally {
      clearInterval(stepInterval);
      setLoading(false);
    }
  }

  return (
    <main style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>MaterialView Pro — Demo</h1>
        <p style={styles.subtitle}>
          Veja como ficaria um novo piso no seu ambiente. Sem cadastro, sem cartão.
        </p>
      </header>

      <section style={styles.card}>
        <ImageUploader onImage={setImageBase64} />
        <MaterialSelector
          materials={MATERIALS}
          selected={material}
          onChange={setMaterial}
        />

        <button
          onClick={handleSimulate}
          disabled={!imageBase64 || loading}
          style={imageBase64 && !loading ? styles.btnPrimary : styles.btnDisabled}
        >
          {loading ? 'Simulando com IA...' : 'Simular'}
        </button>
      </section>

      {loading && (
        <section style={styles.progressSection} aria-live="polite">
          <div style={styles.spinner} aria-hidden="true" />
          <p style={styles.progressText}>{PROGRESS_STEPS[progressStep]}</p>
        </section>
      )}

      {error && (
        <p role="alert" style={styles.error}>{error}</p>
      )}

      {result && (
        <section style={styles.resultSection}>
          <img
            src={result.editedImageBase64}
            alt="Simulação de piso gerada pela IA"
            style={styles.resultImage}
          />
          {result.provider && (
            <p style={styles.providerBadge}>Simulado com {result.provider}</p>
          )}
        </section>
      )}

      <section style={styles.ctaSection}>
        <p style={styles.ctaText}>Gostou? Comece grátis com 50 simulações</p>
        <button onClick={() => setTrialOpen(true)} style={styles.btnCta}>
          Começar grátis
        </button>
      </section>

      <TrialModal
        open={trialOpen}
        onClose={() => setTrialOpen(false)}
      />
    </main>
  );
}

const styles = {
  container: {
    maxWidth: '640px',
    margin: '0 auto',
    padding: '2rem 1rem',
    fontFamily: 'sans-serif',
  },
  header: { textAlign: 'center', marginBottom: '2rem' },
  title: { fontSize: '1.75rem', margin: 0 },
  subtitle: { color: '#6b7280', marginTop: '0.5rem' },
  card: {
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '1.5rem',
    marginBottom: '1.5rem',
  },
  btnPrimary: {
    marginTop: '1rem',
    padding: '0.75rem 1.5rem',
    background: '#16a34a',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '1rem',
    cursor: 'pointer',
    width: '100%',
  },
  btnDisabled: {
    marginTop: '1rem',
    padding: '0.75rem 1.5rem',
    background: '#d1d5db',
    color: '#9ca3af',
    border: 'none',
    borderRadius: '6px',
    fontSize: '1rem',
    cursor: 'not-allowed',
    width: '100%',
  },
  progressSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '1.5rem',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e5e7eb',
    borderTop: '4px solid #16a34a',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  progressText: { color: '#374151', fontSize: '0.95rem' },
  error: {
    color: '#dc2626',
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '6px',
    padding: '0.75rem 1rem',
    marginBottom: '1rem',
  },
  resultSection: { textAlign: 'center', marginBottom: '2rem' },
  resultImage: { maxWidth: '100%', borderRadius: '8px', boxShadow: '0 2px 12px rgba(0,0,0,0.1)' },
  providerBadge: {
    marginTop: '0.5rem',
    fontSize: '0.8rem',
    color: '#6b7280',
    fontStyle: 'italic',
  },
  ctaSection: {
    textAlign: 'center',
    padding: '2rem',
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '8px',
  },
  ctaText: { fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', color: '#15803d' },
  btnCta: {
    padding: '0.75rem 2rem',
    background: '#15803d',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '1rem',
    cursor: 'pointer',
  },
};
