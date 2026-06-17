import { useState } from 'react';
import ImageUploader from './components/ImageUploader.jsx';
import MaterialSelector from './components/MaterialSelector.jsx';
import ResultViewer from './components/ResultViewer.jsx';
import CheckoutModal from './components/CheckoutModal.jsx';
import TrialModal from './components/TrialModal.jsx';
import Demo from './pages/Demo.jsx';
import MinhaConta from './pages/MinhaConta.jsx';
import { useAffiliate } from './hooks/useAffiliate.js';
import { useSimulation } from './hooks/useSimulation.js';

const MATERIALS = [
  { type: 'porcelanato', color: 'cinza-claro', dimensions: '60x60cm', category: 'floor' },
  { type: 'vinílico', color: 'carvalho', dimensions: '120x20cm', category: 'floor' },
  { type: 'madeira', color: 'bege', dimensions: '90x15cm', category: 'floor' },
  { type: 'tinta-acrilica', color: 'branco-neve', dimensions: '18L', category: 'paint' },
  { type: 'esmalte-automotivo', color: 'preto-jet', dimensions: '1L', category: 'automotive' },
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
  const sim = useSimulation();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [trialOpen, setTrialOpen] = useState(false);

  return (
    <main>
      <h1>MaterialView Pro</h1>
      <ImageUploader onImage={sim.setImageBase64} />
      <MaterialSelector
        materials={MATERIALS}
        selected={sim.material}
        onChange={sim.setMaterial}
      />
      <button onClick={sim.simulate} disabled={!sim.imageBase64 || sim.loading}>
        {sim.loading ? sim.progressLabel : 'Simular'}
      </button>
      {sim.loading && (
        <p aria-live="polite" style={{ color: '#6b7280', fontSize: '0.9rem' }}>
          {sim.progressLabel}
        </p>
      )}
      <button onClick={() => setCheckoutOpen(true)}>Assinar</button>
      <button onClick={() => setTrialOpen(true)}>Começar grátis</button>
      <ResultViewer result={sim.result} error={sim.error} />
      {sim.result?.provider && (
        <p style={{ fontSize: '0.8rem', color: '#6b7280', fontStyle: 'italic' }}>
          Simulado com {sim.result.provider}
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
