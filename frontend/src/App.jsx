// frontend/src/App.jsx
import { useState } from 'react';
import ImageUploader from './components/ImageUploader.jsx';
import MaterialSelector from './components/MaterialSelector.jsx';
import ResultViewer from './components/ResultViewer.jsx';
import CheckoutModal from './components/CheckoutModal.jsx';
import TrialModal from './components/TrialModal.jsx';
import Demo from './pages/Demo.jsx';
import MinhaConta from './pages/MinhaConta.jsx';
import { simulate } from './api/client.js';
import { useAffiliate } from './hooks/useAffiliate.js';

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

// Roteamento simples baseado em pathname
function useRoute() {
  return window.location.pathname;
}

export default function App() {
  const route = useRoute();

  // Rota /demo: renderiza a página de demonstração pública
  if (route === '/demo' || route.startsWith('/demo/')) {
    return <Demo />;
  }

  if (route === '/minha-conta') {
    return <MinhaConta />;
  }

  return <MainApp />;
}

function MainApp() {
  const affiliateRef = useAffiliate();
  const [imageBase64, setImageBase64] = useState(null);
  const [material, setMaterial] = useState(MATERIALS[0]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [trialOpen, setTrialOpen] = useState(false);

  async function handleSimulate() {
    if (!imageBase64) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setProgressStep(0);

    const stepInterval = setInterval(() => {
      setProgressStep((prev) => Math.min(prev + 1, PROGRESS_STEPS.length - 1));
    }, 2000);

    try {
      const response = await simulate(imageBase64, material);

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
        setError(
          'Este material não é compatível com a imagem. Tente outro material ou outra foto.'
        );
      } else {
        setError('Ocorreu um erro ao processar sua solicitação. Tente novamente.');
      }
    } catch {
      setError('Ocorreu um erro ao processar sua solicitação. Tente novamente.');
    } finally {
      clearInterval(stepInterval);
      setLoading(false);
    }
  }

  return (
    <main>
      <h1>PisosRealView</h1>
      <ImageUploader onImage={setImageBase64} />
      <MaterialSelector
        materials={MATERIALS}
        selected={material}
        onChange={setMaterial}
      />
      <button onClick={handleSimulate} disabled={!imageBase64 || loading}>
        {loading ? PROGRESS_STEPS[progressStep] : 'Simular'}
      </button>
      {loading && (
        <p aria-live="polite" style={{ color: '#6b7280', fontSize: '0.9rem' }}>
          {PROGRESS_STEPS[progressStep]}
        </p>
      )}
      <button onClick={() => setCheckoutOpen(true)}>Assinar</button>
      <button onClick={() => setTrialOpen(true)}>Começar grátis</button>
      <ResultViewer result={result} error={error} />
      {result?.provider && (
        <p style={{ fontSize: '0.8rem', color: '#6b7280', fontStyle: 'italic' }}>
          Simulado com {result.provider}
        </p>
      )}
      <CheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        affiliateRef={affiliateRef}
      />
      <TrialModal
        open={trialOpen}
        onClose={() => setTrialOpen(false)}
        affiliateRef={affiliateRef}
      />
    </main>
  );
}
