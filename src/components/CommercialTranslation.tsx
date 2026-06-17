import React from 'react';
import { ArrowRight } from 'lucide-react';
import './CommercialTranslation.css';

const CommercialTranslation: React.FC = () => {
  return (
    <section className="translation-section section-padding">
      <div className="container">
        
        <div className="translation-header">
          <h2 className="section-title">From Specs to Story.</h2>
          <p className="section-description">
            Watch how cognitive AI translates dry architectural specifications into compelling premium narratives that justify your pricing.
          </p>
        </div>

        <div className="translation-showcase">
          <div className="spec-card before">
            <span className="state-label">Input: Technical Spec</span>
            <div className="spec-content">
              <h3>90x90 Satin Porcelain Tile</h3>
              <ul className="spec-list">
                <li>Material: Porcelain</li>
                <li>Finish: Satin</li>
                <li>Joints: 2mm</li>
                <li>Color: Warm Grey</li>
              </ul>
            </div>
          </div>

          <div className="translation-arrow">
            <ArrowRight size={32} className="arrow-icon" />
            <div className="pulse-ring"></div>
          </div>

          <div className="spec-card after glass-panel">
            <span className="state-label highlight">Output: Commercial Narrative</span>
            <div className="spec-content">
              <p className="narrative-text">
                "A seamless, monolithic surface that amplifies spatial continuity. The subtle satin finish diffuses natural light beautifully, communicating a silent sophistication that elevates the entire architectural volume and expands the perceived scale of the room."
              </p>
              <div className="impact-metrics">
                <div className="i-metric">
                  <span className="i-val">+24%</span>
                  <span className="i-lbl">Perceived Value</span>
                </div>
                <div className="i-metric">
                  <span className="i-val">-40%</span>
                  <span className="i-lbl">Price Friction</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};

export default CommercialTranslation;
