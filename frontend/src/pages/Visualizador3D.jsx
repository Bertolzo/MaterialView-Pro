import { useEffect, useRef } from 'react';
import '@playcanvas/supersplat-viewer';

const SAMPLE_MODELS = [
  { name: 'Showroom', url: '/samples/showroom.ply' },
];

export default function Visualizador3D() {
  const viewerRef = useRef(null);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    viewer.addEventListener('load', () => {
      console.log('[Supersplat] Modelo carregado');
    });
  }, []);

  return (
    <main style={{
      position: 'fixed', inset: 0,
      display: 'flex', flexDirection: 'column',
      background: '#111', color: '#fff',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0.75rem 1.5rem', background: '#1a1a2e', zIndex: 10,
      }}>
        <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>
          MaterialView Pro — Visualizador 3D
        </h1>
        <a href="/" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.9rem' }}>
          ← Voltar
        </a>
      </header>
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '1rem',
      }}>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center', maxWidth: 500 }}>
          Demonstração de visualização 3D navegável. Use o mouse para rotacionar
          e o scroll para zoom. Nos planos Enterprise, transformamos a foto do seu
          cliente em um modelo 3D realista.
        </p>
        <div style={{
          width: '90%', maxWidth: 960, aspectRatio: '16/9',
          borderRadius: 8, overflow: 'hidden', border: '1px solid #333',
        }}>
          <supersplat-viewer
            ref={viewerRef}
            src={SAMPLE_MODELS[0].url}
            style={{ width: '100%', height: '100%', display: 'block' }}
          />
        </div>
        <p style={{ color: '#64748b', fontSize: '0.8rem' }}>
          Modelo de demonstração: {SAMPLE_MODELS[0].name}
        </p>
      </div>
    </main>
  );
}
