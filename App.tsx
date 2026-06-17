import React from 'react';
import Hero from './src/components/Hero';
import TheProblem from './src/components/TheProblem';
import TheShift from './src/components/TheShift';
import CoreEngine from './src/components/CoreEngine';
import CommercialTranslation from './src/components/CommercialTranslation';
import Benefits from './src/components/Benefits';
import Differentiation from './src/components/Differentiation';
import SocialProof from './src/components/SocialProof';
import FinalCTA from './src/components/FinalCTA';
import './src/index.css';

const Navigation = () => (
  <nav style={{
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '2rem 4rem', borderBottom: '1px solid rgba(255,255,255,0.05)'
  }}>
    <div style={{ fontFamily: 'var(--font-primary)', fontSize: '1.25rem', letterSpacing: '0.1em', fontWeight: 300 }}>
      SPATIAL<span style={{ color: 'var(--color-arch-gray)' }}>INTEL</span>
    </div>
    <div style={{ display: 'flex', gap: '2rem', fontSize: '0.9rem', color: 'var(--color-arch-gray)' }}>
      <a href="#" style={{ transition: 'color 0.3s' }} onMouseOver={(e) => e.currentTarget.style.color = 'var(--color-soft-white)'} onMouseOut={(e) => e.currentTarget.style.color = 'var(--color-arch-gray)'}>Platform</a>
      <a href="#" style={{ transition: 'color 0.3s' }} onMouseOver={(e) => e.currentTarget.style.color = 'var(--color-soft-white)'} onMouseOut={(e) => e.currentTarget.style.color = 'var(--color-arch-gray)'}>Methodology</a>
      <a href="#" style={{ transition: 'color 0.3s' }} onMouseOver={(e) => e.currentTarget.style.color = 'var(--color-soft-white)'} onMouseOut={(e) => e.currentTarget.style.color = 'var(--color-arch-gray)'}>Cases</a>
      <a href="#" style={{ transition: 'color 0.3s' }} onMouseOver={(e) => e.currentTarget.style.color = 'var(--color-soft-white)'} onMouseOut={(e) => e.currentTarget.style.color = 'var(--color-arch-gray)'}>Contact</a>
    </div>
  </nav>
);

const Footer = () => (
  <footer style={{
    padding: '4rem 0', backgroundColor: 'var(--color-matte-black)',
    borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center',
    color: 'var(--color-arch-gray)', fontSize: '0.85rem'
  }}>
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '2rem' }}>
        <div style={{ fontFamily: 'var(--font-primary)', fontSize: '1.25rem', letterSpacing: '0.1em', fontWeight: 300 }}>
          SPATIAL<span style={{ color: 'var(--color-arch-gray)' }}>INTEL</span>
        </div>
        <div style={{ display: 'flex', gap: '2rem' }}>
          <span>© 2026 Spatial Intelligence Engine</span>
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
        </div>
      </div>
    </div>
  </footer>
);

function App() {
  return (
    <>
      <Navigation />
      <Hero />
      <TheProblem />
      <TheShift />
      <CoreEngine />
      <CommercialTranslation />
      <Benefits />
      <Differentiation />
      <SocialProof />
      <FinalCTA />
      <Footer />
    </>
  );
}

export default App;