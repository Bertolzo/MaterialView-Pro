import React from 'react';
import './SocialProof.css';

const SocialProof: React.FC = () => {
  return (
    <section className="proof-section section-padding">
      <div className="container">
        
        <p className="proof-kicker text-center">Trusted by spatial visionaries</p>
        
        <div className="logo-strip">
          <div className="logo-item">AURA STUDIOS</div>
          <div className="logo-item">NOVA ARCHITECTS</div>
          <div className="logo-item">LUMINA DEVELOPMENTS</div>
          <div className="logo-item">VANTAGE PROPERTIES</div>
          <div className="logo-item">ATELIER CORE</div>
        </div>

        <div className="proof-metrics">
          <div className="p-metric">
            <span className="p-val">$4.2B</span>
            <span className="p-lbl">Project Value Analyzed</span>
          </div>
          <div className="p-metric">
            <span className="p-val">18%</span>
            <span className="p-lbl">Avg. Value Uplift Detected</span>
          </div>
          <div className="p-metric">
            <span className="p-val">12K+</span>
            <span className="p-lbl">Friction Points Resolved</span>
          </div>
        </div>

      </div>
    </section>
  );
};

export default SocialProof;
