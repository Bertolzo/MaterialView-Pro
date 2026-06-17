import React from 'react';
import { ShieldCheck, TrendingUp, Clock, Zap } from 'lucide-react';
import './Benefits.css';

const Benefits: React.FC = () => {
  return (
    <section className="benefits-section section-padding">
      <div className="container">
        
        <div className="benefits-grid">
          
          <div className="benefit-card">
            <div className="b-icon-wrapper">
              <TrendingUp size={24} />
            </div>
            <h3 className="b-title">Elevate Perceived Value</h3>
            <p className="b-description">
              Stop defending prices. Transform material costs into architectural investments by articulating the exact cognitive and aesthetic value they bring to the space.
            </p>
          </div>

          <div className="benefit-card">
            <div className="b-icon-wrapper">
              <Zap size={24} />
            </div>
            <h3 className="b-title">Reduce Sales Friction</h3>
            <p className="b-description">
              Eliminate client hesitation caused by spatial uncertainty. Provide definitive, AI-backed analysis that confirms design coherence and aesthetic safety.
            </p>
          </div>

          <div className="benefit-card">
            <div className="b-icon-wrapper">
              <Clock size={24} />
            </div>
            <h3 className="b-title">Accelerate Approvals</h3>
            <p className="b-description">
              Bypass the subjective revision loop. Presenting quantitative aesthetic metrics allows stakeholders to make objective, confident decisions faster.
            </p>
          </div>

          <div className="benefit-card">
            <div className="b-icon-wrapper">
              <ShieldCheck size={24} />
            </div>
            <h3 className="b-title">Mitigate Execution Risk</h3>
            <p className="b-description">
              Detect visual friction and continuity breaks before procurement. Ensure the specified materials interact flawlessly in the final built environment.
            </p>
          </div>

        </div>

      </div>
    </section>
  );
};

export default Benefits;
