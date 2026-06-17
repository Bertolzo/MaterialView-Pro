import React from 'react';
import { EyeOff, BrainCircuit, AlertCircle } from 'lucide-react';
import './TheProblem.css';

const TheProblem: React.FC = () => {
  return (
    <section className="problem-section section-padding">
      <div className="container">
        <div className="problem-grid">
          
          <div className="problem-content">
            <h2 className="section-title">Visualization is not enough.</h2>
            <p className="section-description">
              Most tools simply render pixels. But clients don't buy pixels—they buy emotions, perceived value, and architectural coherence. When you only show a floor, you leave interpretation to chance.
            </p>
            
            <ul className="problem-list">
              <li>
                <div className="icon-box"><EyeOff size={20} /></div>
                <div>
                  <h4>Subjective Interpretation</h4>
                  <p>Clients struggle to understand why a premium finish costs more without cognitive framing.</p>
                </div>
              </li>
              <li>
                <div className="icon-box"><BrainCircuit size={20} /></div>
                <div>
                  <h4>Decision Fatigue</h4>
                  <p>Too many visual options without strategic guidance lead to paralysis and delayed approvals.</p>
                </div>
              </li>
              <li>
                <div className="icon-box"><AlertCircle size={20} /></div>
                <div>
                  <h4>Value Friction</h4>
                  <p>The gap between architectural intent and client perception causes pricing pushback.</p>
                </div>
              </li>
            </ul>
          </div>
          
          <div className="problem-visual glass-panel">
            <div className="visual-before">
              <div className="tag">Standard Render</div>
              <div className="skeleton-image"></div>
              <div className="skeleton-text short"></div>
              <div className="skeleton-text"></div>
            </div>
            
            <div className="visual-after">
              <div className="tag highlight">Cognitive Interpretation</div>
              <div className="analysis-lines">
                <div className="line"></div>
                <div className="line delay-100"></div>
                <div className="line delay-200"></div>
              </div>
              <div className="insight-box">
                <span className="insight-title">Value Narrative Generated</span>
                <p>"The seamless continuity of this surface expands the perceived volume, creating a silent sophistication that elevates the entire environment."</p>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </section>
  );
};

export default TheProblem;
