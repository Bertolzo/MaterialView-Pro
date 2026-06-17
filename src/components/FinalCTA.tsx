import React from 'react';
import { ArrowRight, Mail } from 'lucide-react';
import './FinalCTA.css';

const FinalCTA: React.FC = () => {
  return (
    <section className="cta-section section-padding">
      <div className="container">
        
        <div className="cta-card glass-panel">
          <div className="cta-content">
            <h2 className="cta-title">
              Stop presenting floors.<br />
              <span className="text-gradient">Start presenting value.</span>
            </h2>
            <p className="cta-description">
              Join the architects and developers who are already using cognitive spatial interpretation to elevate their premium positioning and close deals faster.
            </p>
            
            <div className="cta-actions">
              <button className="btn-primary">
                Analyze My Project <ArrowRight size={18} />
              </button>
              <button className="btn-secondary">
                <Mail size={18} /> Request Private Demo
              </button>
            </div>
          </div>
          
          <div className="cta-visual">
            <div className="abstract-shape shape-1"></div>
            <div className="abstract-shape shape-2"></div>
          </div>
        </div>

      </div>
    </section>
  );
};

export default FinalCTA;
